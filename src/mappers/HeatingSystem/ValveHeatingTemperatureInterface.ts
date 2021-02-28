import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class ValveHeatingTemperatureInterface extends HeatingSystem {   
    
    protected registerServices() {
        this.registerThermostatService();
    }

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return new Command('exitDerogation');

            case Characteristics.TargetHeatingCoolingState.HEAT:
                return new Command('setDerogation', ['comfort', 'further_notice']);

            case Characteristics.TargetHeatingCoolingState.COOL:
                return new Command('setDerogation', ['eco', 'further_notice']);

            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setDerogation', ['away', 'further_notice']);
        }
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> | undefined {
        return new Command('setDerogation', [value, 'further_notice']);
    }

    protected onStateChanged(name, value) {
        super.onStateChanged(name, value);
        switch(name) {
            case 'core:OperatingModeState':
            case 'io:CurrentHeatingModeState':
                this.postpone(this.computeStates);
                break;
            case 'core:TargetRoomTemperatureState': 
                this.targetTemperature?.updateValue(value);
                break;
        }
    }

    protected computeStates() {
        let targetState;

        const auto = ['auto', 'prog', 'program'].includes(this.device.get('core:OperatingModeState') || '');

        switch(this.device.get('io:CurrentHeatingModeState')) {
            case 'manual':
            case 'comfort':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                targetState = auto ? Characteristics.TargetHeatingCoolingState.AUTO : Characteristics.TargetHeatingCoolingState.HEAT;
                break;
            case 'eco':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                targetState = auto ? Characteristics.TargetHeatingCoolingState.AUTO : Characteristics.TargetHeatingCoolingState.COOL;
                break;
            case 'off':
            case 'awayMode':
            case 'frostprotection':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                targetState = Characteristics.TargetHeatingCoolingState.OFF;
                break;
        }
        if(this.targetState !== undefined && targetState !== undefined && this.device.isIdle) {
            this.targetState.value = targetState;
        }
    }
}