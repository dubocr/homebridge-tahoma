import { Characteristics } from '../../Platform';
import { Perms } from 'homebridge';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalHeater extends HeatingSystem {   
    
    protected registerServices() {
        this.registerThermostatService();

        this.targetState?.setProps({ validValues: [
            Characteristics.TargetHeatingCoolingState.HEAT,
            Characteristics.TargetHeatingCoolingState.COOL,
            Characteristics.TargetHeatingCoolingState.OFF,
        ] });
        this.targetTemperature?.setProps({ perms: [Perms.PAIRED_READ, Perms.EVENTS] });
        this.targetTemperature?.off('set', this.setTargetTemperature);
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        let mode;
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.HEAT:
                mode = 'comfort';
                break;
            case Characteristics.TargetHeatingCoolingState.COOL:
                mode = 'eco';
                break;
            case Characteristics.TargetHeatingCoolingState.OFF:
                mode = 'frostprotection';
                break;
        }
        return new Command('setHeatingLevel', [mode]);
    }

    protected onStateChanged(name, value) {
        let targetState;
        switch(name) {
            case 'io:TargetHeatingLevelState':
                switch(value) {
                    case 'off':
                    case 'frostprotection':
                        targetState = Characteristics.TargetHeatingCoolingState.OFF;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                        break;
                    case 'comfort':
                    case 'comfort-1':
                    case 'comfort-2':
                        targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                        this.currentTemperature?.updateValue(this.comfortTemperature);
                        this.targetTemperature?.updateValue(this.comfortTemperature);
                        break;
                    case 'eco':
                        targetState = Characteristics.TargetHeatingCoolingState.COOL;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                        this.currentTemperature?.updateValue(this.ecoTemperature);
                        this.targetTemperature?.updateValue(this.ecoTemperature);
                        break; 
                }
                if(this.targetState !== undefined && targetState !== undefined && this.isIdle) {
                    this.targetState.updateValue(targetState);
                }
                break;
        }
    }
}