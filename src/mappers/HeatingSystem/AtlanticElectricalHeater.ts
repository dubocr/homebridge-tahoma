import { Perms } from 'homebridge';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalHeater extends HeatingSystem {   
    
    protected registerServices() {
        this.registerThermostatService();

        this.targetState?.setProps({ validValues: [
            this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
            this.platform.Characteristic.TargetHeatingCoolingState.COOL,
            this.platform.Characteristic.TargetHeatingCoolingState.OFF,
        ] });
        this.targetTemperature?.setProps({ perms: [Perms.PAIRED_READ, Perms.EVENTS] }); 
        this.targetTemperature?.off('set', this.setTargetTemperature);
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        let mode;
        switch(value) {
            case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
                mode = 'comfort';
                break;
            case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
                mode = 'eco';
                break;
            case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
                mode = 'standby';
                break;
        }
        return new Command('setHeatingLevel', [mode]);
    }

    protected onStateChange(name, value) {
        switch(name) {
            case 'io:TargetHeatingLevelState':
                switch(value) {
                    case 'off':
                    case 'frostprotection':
                        this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.OFF);
                        this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
                        break;
                    case 'comfort':
                    case 'comfort-1':
                    case 'comfort-2':
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
}