import { Characteristics, Services } from '../../Platform';
import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalTowelDryer extends HeatingSystem {   
    protected drying: Characteristic | undefined;

    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ validValues: [
            Characteristics.TargetHeatingCoolingState.AUTO,
            Characteristics.TargetHeatingCoolingState.HEAT,
            Characteristics.TargetHeatingCoolingState.OFF,
        ] });
        if(this.device.hasCommand('setTowelDryerBoostModeDuration')) {
            this.registerSwitchService('boost');
        }
        if(this.device.hasCommand('setDryingDuration')) {
            const service = this.registerService(Services.Switch, 'drying');
            this.drying = service.getCharacteristic(Characteristics.On);
            
            this.drying?.onSet(this.setDrying.bind(this));
        }
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        const commands = new Array<Command>();
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setTowelDryerOperatingMode', 'internal'));
                break;
            case Characteristics.TargetHeatingCoolingState.HEAT:
                commands.push(new Command('setTowelDryerOperatingMode', 'external'));
                break;
            case Characteristics.TargetHeatingCoolingState.OFF:
                commands.push(new Command('setTowelDryerOperatingMode', 'standby'));
                break;
        }
        return commands;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> | undefined {
        if(this.targetState!.value === Characteristics.TargetHeatingCoolingState.AUTO) {
            return new Command('setDerogatedTargetTemperature', value);
        } else {
            return new Command('setTargetTemperature', value);
        }
    }

    protected getOnCommands(value): Command | Array<Command> {
        const commands = new Array<Command>();
        commands.push(new Command('setTowelDryerTemporaryState', value ? 'boost' : 'permanentHeating'));
        if(value) {
            commands.push(new Command('setTowelDryerBoostModeDuration', 10));
        }
        return commands;
    }

    protected async setDrying(value) {
        const commands = new Array<Command>();
        commands.push(new Command('setTowelDryerTemporaryState', value ? 'drying' : 'permanentHeating'));
        if(value) {
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
        switch(name) {
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
        switch(this.device.get('core:OperatingModeState')) {
            case 'standby':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.OFF);
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
                break;
            case 'internal':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.AUTO);
                if(this.device.get('io:TargetHeatingLevelState') === 'confort') {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                } else {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                    targetTemperature = targetTemperature - Number(this.device.get('core:EcoRoomTemperatureState'));
                }
                if(Number(this.device.get('core:DerogatedTargetTemperatureState')) > 0) {
                    this.targetTemperature?.updateValue(this.device.get('core:DerogatedTargetTemperatureState'));
                } else {
                    this.targetTemperature?.updateValue(targetTemperature);
                }
                break;
            case 'external':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.HEAT);
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
                break;
        }
    }
}