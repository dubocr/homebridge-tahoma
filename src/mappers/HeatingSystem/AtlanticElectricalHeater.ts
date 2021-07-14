import { Characteristics } from '../../Platform';
import { Perms } from 'homebridge';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalHeater extends HeatingSystem {
    protected THERMOSTAT_CHARACTERISTICS = ['eco'];

    protected registerServices() {
        this.registerThermostatService();
        this.targetTemperature?.setProps({ perms: [Perms.PAIRED_READ, Perms.EVENTS] });
        this.targetTemperature?.off('set', this.setTargetTemperature);
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return new Command('setHeatingLevel', [this?.eco?.value ? 'eco' : 'comfort']);
            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setHeatingLevel', ['frostprotection']);
        }
        return [];
    }

    protected onStateChanged(name, value) {
        let targetState;
        switch (name) {
            case 'io:TargetHeatingLevelState':
                targetState = Characteristics.TargetHeatingCoolingState.AUTO;
                switch (value) {
                    case 'off':
                    case 'frostprotection':
                        targetState = Characteristics.TargetHeatingCoolingState.OFF;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                        break;
                    case 'comfort':
                    case 'comfort-1':
                    case 'comfort-2':
                        this.eco?.updateValue(false);
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                        this.currentTemperature?.updateValue(this.comfortTemperature);
                        this.targetTemperature?.updateValue(this.comfortTemperature);
                        break;
                    case 'eco':
                        this.eco?.updateValue(true);
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                        this.currentTemperature?.updateValue(this.ecoTemperature);
                        this.targetTemperature?.updateValue(this.ecoTemperature);
                        break;
                }
                if (this.targetState !== undefined && targetState !== undefined && this.isIdle) {
                    this.targetState.updateValue(targetState);
                }
                break;
        }
    }
}