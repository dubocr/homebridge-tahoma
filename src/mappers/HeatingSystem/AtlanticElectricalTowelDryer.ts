import { Characteristics, Services } from '../../Platform';
import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalTowelDryer extends HeatingSystem {
    protected MIN_TEMP = 7;
    protected MAX_TEMP = 28;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.HEAT,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected drying: Characteristic | undefined;

    protected registerServices() {
        this.registerThermostatService();
        if (this.device.hasCommand('setTowelDryerBoostModeDuration')) {
            this.registerSwitchService('boost');
        }
        if (this.device.hasCommand('setDryingDuration')) {
            const service = this.registerService(Services.Switch, 'drying');
            this.drying = service.getCharacteristic(Characteristics.On);

            this.drying?.onSet(this.setDrying.bind(this));
        }
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return new Command('setTowelDryerOperatingMode', 'internal');
            case Characteristics.TargetHeatingCoolingState.HEAT:
                return [
                    new Command('setTowelDryerOperatingMode', 'external'),
                    new Command('setHeatingLevel', 'comfort'),
                ];
            case Characteristics.TargetHeatingCoolingState.COOL:
                return [
                    new Command('setTowelDryerOperatingMode', 'external'),
                    new Command('setHeatingLevel', 'eco'),
                ];
            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setTowelDryerOperatingMode', 'standby');
        }
        return [];
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> | undefined {
        if (this.targetState!.value === Characteristics.TargetHeatingCoolingState.AUTO) {
            return new Command('setDerogatedTargetTemperature', value);
        } else {
            return new Command('setTargetTemperature', value);
        }
    }

    protected getOnCommands(value): Command | Array<Command> {
        const commands = new Array<Command>();
        commands.push(new Command('setTowelDryerTemporaryState', value ? 'boost' : 'permanentHeating'));
        if (value) {
            commands.push(new Command('setTowelDryerBoostModeDuration', 10));
        }
        return commands;
    }

    protected async setDrying(value) {
        const commands = new Array<Command>();
        commands.push(new Command('setTowelDryerTemporaryState', value ? 'drying' : 'permanentHeating'));
        if (value) {
            commands.push(new Command('setDryingDuration', 60));
        }
        const action = await this.executeCommands(commands);
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.FAILED:
                    this.drying?.updateValue(!value);
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:TemperatureState': this.onTemperatureUpdate(value); break;
            case 'io:TowelDryerTemporaryStateState':
                this.on?.updateValue(value === 'boost');
                this.drying?.updateValue(value === 'drying');
                break;
            case 'core:TargetTemperatureState':
            case 'core:DerogatedTargetTemperatureState':
            case 'core:ComfortRoomTemperatureState':
            case 'core:EcoRoomTemperatureState':
            case 'core:OperatingModeState':
            case 'io:TargetHeatingLevelState':
                this.postpone(this.computeStates);
                break;
        }
    }

    protected computeStates() {
        let targetTemperature = Number(this.device.get('core:ComfortRoomTemperatureState'));
        switch (this.device.get('io:TargetHeatingLevelState')) {
            case 'off':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
                break;
            case 'eco':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                targetTemperature = targetTemperature - Number(this.device.get('core:EcoRoomTemperatureState'));
                break;
            case 'comfort':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                break;
        }

        switch (this.device.get('core:OperatingModeState')) {
            case 'standby':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.OFF);
                break;
            case 'internal':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.AUTO);
                if (Number(this.device.get('core:DerogatedTargetTemperatureState')) > 0) {
                    this.targetTemperature?.updateValue(this.device.get('core:DerogatedTargetTemperatureState'));
                } else {
                    this.targetTemperature?.updateValue(targetTemperature);
                }
                break;
            case 'external':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.HEAT);
                break;
        }
    }
}