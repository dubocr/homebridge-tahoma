import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint extends HeatingSystem {   
    
    protected registerServices() {
        this.registerThermostatService();
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        let mode;
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                mode = 'auto';
                break;
            case Characteristics.TargetHeatingCoolingState.HEAT:
                mode = 'normal';
                break;
            case Characteristics.TargetHeatingCoolingState.COOL:
                mode = 'eco';
                break;
            case Characteristics.TargetHeatingCoolingState.OFF:
                mode = 'standby';
                break;
        }
        return new Command('setOperatingMode', [mode]);
    }

    protected onStateChanged(name: string, value) {
        this.debug(name + ' => ' + value);
        switch(name) {
            case 'core:ComfortRoomTemperatureState': this.onTemperatureUpdate(value); break;
            case 'io:EffectiveTemperatureSetpointState': this.targetTemperature?.updateValue(value); break;
        }
    }

    protected onStatesUpdate() {
        this.debug('States updated => ' + this.device.get('core:OperatingModeState'));
        switch(this.device.get('core:OperatingModeState')) {
            case 'off':
            case 'away':
            case 'frostprotection':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.OFF);
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                break;
            case 'auto':
            case 'prog':
            case 'program':
            case 'internal':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.AUTO);
                if(this.device.get('io:TargetHeatingLevelState') === 'eco') {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                } else {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                }
                break;
            case 'comfort':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.HEAT);
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                break;
            case 'eco':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.COOL);
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                break; 
        }
    }
}