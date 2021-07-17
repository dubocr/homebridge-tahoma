import { Characteristics } from '../../Platform';
import { Perms } from 'homebridge';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

const FROSTPROTECTION_TEMP = 7;

export default class AtlanticElectricalHeater extends HeatingSystem {
    protected THERMOSTAT_CHARACTERISTICS = ['eco'];
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.HEAT,
        Characteristics.TargetHeatingCoolingState.COOL,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected registerServices() {
        this.registerThermostatService();
        this.targetTemperature?.setProps({ minValue: FROSTPROTECTION_TEMP, maxValue: this.comfortTemperature, minStep: 1 });
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return new Command('setHeatingLevel', this?.eco?.value ? 'eco' : 'comfort');
            case Characteristics.TargetHeatingCoolingState.HEAT:
                return new Command('setHeatingLevel', 'comfort');
            case Characteristics.TargetHeatingCoolingState.COOL:
                return new Command('setHeatingLevel', 'eco');
            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setHeatingLevel', 'off');
        }
        return [];
    }

    protected async setTargetTemperature(value) {
        const frostEcoLimit = FROSTPROTECTION_TEMP + (this.ecoTemperature - FROSTPROTECTION_TEMP) / 2;
        const ecoComfortLimit = this.ecoTemperature + (this.comfortTemperature - this.ecoTemperature) / 2;
        let newValue = value;
        if (value <= frostEcoLimit) {
            newValue = FROSTPROTECTION_TEMP;
        } else if (value > frostEcoLimit && value <= this.ecoTemperature) {
            newValue = this.ecoTemperature;
        } else if (value > this.ecoTemperature && value <= ecoComfortLimit) {
            newValue = this.comfortTemperature;
        }
        if (newValue !== value) {
            this.targetTemperature?.updateValue(newValue);
        }
        await this.executeCommands(this.getTargetTemperatureCommands(newValue));
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> | undefined {
        if (value === FROSTPROTECTION_TEMP) {
            this.targetState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
            return new Command('setHeatingLevel', 'frostprotection');
        } else if (value === this.ecoTemperature) {
            this.targetState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
            return new Command('setHeatingLevel', 'eco');
        } else if (value === this.comfortTemperature) {
            this.targetState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
            return new Command('setHeatingLevel', 'comfort');
        }
    }

    protected getProgCommands(): Command | Array<Command> | undefined {
        return new Command('setHeatingLevel', this?.eco?.value ? 'eco' : 'comfort');
    }

    protected onStateChanged(name, value) {
        let targetState;
        switch (name) {
            case 'io:TargetHeatingLevelState':
                //targetState = Characteristics.TargetHeatingCoolingState.AUTO;
                switch (value) {
                    case 'off':
                        targetState = Characteristics.TargetHeatingCoolingState.OFF;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                        break;
                    case 'frostprotection':
                        targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                        this.currentTemperature?.updateValue(FROSTPROTECTION_TEMP);
                        this.targetTemperature?.updateValue(FROSTPROTECTION_TEMP);
                        break;
                    case 'comfort':
                    case 'comfort-1':
                    case 'comfort-2':
                        targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                        this.eco?.updateValue(false);
                        this.currentTemperature?.updateValue(this.comfortTemperature);
                        this.targetTemperature?.updateValue(this.comfortTemperature);
                        break;
                    case 'eco':
                        targetState = Characteristics.TargetHeatingCoolingState.COOL;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                        this.eco?.updateValue(true);
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