import { Characteristics, Services } from '../Platform';
import { Characteristic, Service } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';
import { EcoCharacteristic, ProgCharacteristic } from '../CustomCharacteristics';

export default class HeatingSystem extends Mapper {
    protected THERMOSTAT_CHARACTERISTICS: string[] = [];
    protected MIN_TEMP = 7;
    protected MAX_TEMP = 26;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected currentTemperature: Characteristic | undefined;
    protected targetTemperature: Characteristic | undefined;
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected on: Characteristic | undefined;

    protected prog: Characteristic | undefined;
    protected eco: Characteristic | undefined;

    protected derogationDuration;
    protected comfortTemperature;
    protected ecoTemperature;

    protected applyConfig(config) {
        this.derogationDuration = config['derogationDuration'] || 1;
        this.comfortTemperature = config['comfort'] || 19;
        this.ecoTemperature = config['eco'] || 17;
    }

    protected registerThermostatService(subtype?: string): Service {
        const service = this.registerService(Services.Thermostat, subtype);
        service.setPrimaryService(true);
        service.addOptionalCharacteristic(ProgCharacteristic);
        service.addOptionalCharacteristic(EcoCharacteristic);
        this.currentTemperature = service.getCharacteristic(Characteristics.CurrentTemperature);
        this.targetTemperature = service.getCharacteristic(Characteristics.TargetTemperature);
        this.currentState = service.getCharacteristic(Characteristics.CurrentHeatingCoolingState);
        this.targetState = service.getCharacteristic(Characteristics.TargetHeatingCoolingState);

        this.targetState?.setProps({ validValues: this.TARGET_MODES });
        this.targetTemperature?.setProps({ minValue: this.MIN_TEMP, maxValue: this.MAX_TEMP, minStep: 0.5 });
        if (this.targetTemperature && this.targetTemperature.value! < this.targetTemperature.props.minValue!) {
            this.targetTemperature.value = this.targetTemperature.props.minValue!;
        }
        if (this.targetTemperature && this.targetTemperature.value! > this.targetTemperature.props.maxValue!) {
            this.targetTemperature.value = this.targetTemperature.props.maxValue!;
        }

        if (this.THERMOSTAT_CHARACTERISTICS.includes('prog')) {
            this.prog = service.getCharacteristic(ProgCharacteristic);
            this.prog.onSet((value) => {
                this.prog?.updateValue(value);
                this.sendCommands();
            });
        }

        if (this.THERMOSTAT_CHARACTERISTICS.includes('eco')) {
            this.eco = service.getCharacteristic(EcoCharacteristic);
            this.eco.onSet((value) => {
                this.eco?.updateValue(value);
                this.sendCommands();
            });
        }

        this.targetState?.onSet(this.setTargetState.bind(this));
        this.targetTemperature?.onSet(this.debounce(this.setTargetTemperature));
        return service;
    }

    protected registerSwitchService(subtype?: string): Service {
        const service = this.registerService(Services.Switch, subtype);
        this.on = service.getCharacteristic(Characteristics.On);

        this.on?.onSet(this.setOn.bind(this));
        return service;
    }

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return new Command('auto');
            case Characteristics.TargetHeatingCoolingState.HEAT:
                return new Command('heat');
            case Characteristics.TargetHeatingCoolingState.COOL:
                return new Command('cool');
            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('off');
            default:
                return new Command('auto');
        }
    }

    protected async setTargetState(value) {
        if (value === this.targetState?.value) {
            return;
        }
        const action = await this.executeCommands(this.getTargetStateCommands(value));
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    if (this.stateless) {
                        this.currentState?.updateValue(value);
                    }
                    break;
                case ExecutionState.FAILED:
                    if (this.currentState) {
                        this.targetState?.updateValue(this.currentState.value);
                    }
                    break;
            }
        });
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> | undefined {
        return new Command('setTargetTemperature', value);
    }

    protected async setTargetTemperature(value) {
        await this.executeCommands(this.getTargetTemperatureCommands(value));
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command('setOn', value);
    }

    protected async setOn(value) {
        const action = await this.executeCommands(this.getOnCommands(value));
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.FAILED:
                    this.on?.updateValue(!value);
                    break;
            }
        });
    }

    protected sendCommands() {
        if (this.targetState?.value !== Characteristics.TargetHeatingCoolingState.OFF) {
            this.executeCommands(this.getTargetStateCommands(this.targetState?.value));
        }
    }

    protected onTemperatureUpdate(value) {
        this.currentTemperature?.updateValue(value > 273.15 ? (value - 273.15) : value);
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:TemperatureState': this.onTemperatureUpdate(value); break;
            case 'core:TargetTemperatureState':
                this.targetTemperature?.updateValue(value);
                break;
        }
    }
}