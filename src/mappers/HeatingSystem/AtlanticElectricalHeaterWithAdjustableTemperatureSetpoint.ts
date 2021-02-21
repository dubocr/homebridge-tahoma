import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint extends HeatingSystem {   
    
    protected registerServices() {
        this.registerThermostatService();
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        let mode;
        switch(value) {
            case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
                mode = 'auto';
                break;
            case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
                mode = 'normal';
                break;
            case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
                mode = 'eco';
                break;
            case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
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
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.OFF);
                this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
                break;
            case 'auto':
            case 'prog':
            case 'program':
            case 'internal':
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.AUTO);
                if(this.device.get('io:TargetHeatingLevelState') === 'eco') {
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
                } else {
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                }
                break;
            case 'comfort':
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
                this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                break;
            case 'eco':
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.COOL);
                this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
                break; 
        }
    }
}