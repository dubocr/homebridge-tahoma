import { Characteristics } from '../../Platform';
import { Characteristic, Perms } from 'homebridge';
import { Command } from 'overkiz-client';
import WaterHeatingSystem from '../WaterHeatingSystem';

export default class DomesticHotWaterProduction extends WaterHeatingSystem {
    protected registerServices() {
        this.registerThermostatService();
        //this.registerSwitchService('boost');
    }

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        if(this.device.hasCommand('setDHWMode')) {
            switch(value) {
                case Characteristics.TargetHeatingCoolingState.AUTO:
                    return new Command('setDHWMode', 'autoMode');
                case Characteristics.TargetHeatingCoolingState.HEAT:
                    return new Command('setDHWMode', 'manualEcoInactive');
                case Characteristics.TargetHeatingCoolingState.COOL:
                    return new Command('setDHWMode', 'manualEcoActive');
                case Characteristics.TargetHeatingCoolingState.OFF:
                    return new Command('setCurrentOperatingMode', { 'relaunch': 'off', 'absence': 'on' });
            }
        } else if(this.device.hasCommand('setCurrentOperatingMode')) {
            switch(value) {
                case Characteristics.TargetHeatingCoolingState.AUTO:
                    return new Command('setCurrentOperatingMode', { 'relaunch': 'off', 'absence': 'off' });
                case Characteristics.TargetHeatingCoolingState.HEAT:
                    return new Command('setCurrentOperatingMode', { 'relaunch': 'on', 'absence': 'off' });
                case Characteristics.TargetHeatingCoolingState.OFF:
                    return new Command('setCurrentOperatingMode', { 'relaunch': 'off', 'absence': 'on' });
            }
        } else if(this.device.hasCommand('setBoostModeDuration')) {
            switch(value) {
                case Characteristics.TargetHeatingCoolingState.AUTO:
                    return [
                        new Command('setBoostModeDuration', 0),
                        new Command('setAwayModeDuration', 0),
                    ];
                case Characteristics.TargetHeatingCoolingState.HEAT:
                    return new Command('setBoostModeDuration', 1);
                case Characteristics.TargetHeatingCoolingState.OFF:
                    return new Command('setAwayModeDuration', 30);
            }
        } else if(this.device.hasCommand('setBoostMode')) {
            switch(value) {
                case Characteristics.TargetHeatingCoolingState.AUTO:
                    return [
                        new Command('setBoostMode', 'off'),
                        new Command('setAbsenceMode', 'off'),
                    ];
                case Characteristics.TargetHeatingCoolingState.HEAT:
                    return new Command('setBoostMode', 'on');
                case Characteristics.TargetHeatingCoolingState.OFF:
                    return new Command('setAbsenceMode', 'on');
            }
        }
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        return new Command('setWaterTargetTemperature', value);
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command('setBoostMode', value ? 'on' : 'off');
    }

    protected onStateChanged(name: string, value) {
        let targetState;
        switch(name) {
            case 'io:DHWBoostModeState':
                this.on?.updateValue(value === 'on');
                break;
            case 'core:WaterTemperatureState':
                if(!this.device.hasState('core:MiddleWaterTemperatureInState')) {
                    this.currentTemperature?.updateValue(value);
                }
                break;
            case 'core:MiddleWaterTemperatureInState':
                this.currentTemperature?.updateValue(value);
                break;
            case 'core:WaterTargetTemperatureState':
                this.targetTemperature?.updateValue(value);
                break;
            case 'io:DHWModeState':
                switch(value) {
                    case 'autoMode':
                        targetState = Characteristics.TargetHeatingCoolingState.AUTO;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                        break;
                    case 'manualEcoInactive':
                        targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                        break;
                    case 'manualEcoActive':
                        targetState = Characteristics.TargetHeatingCoolingState.COOL;
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                        break;
                }
                if(this.targetState !== undefined && targetState !== undefined && this.isIdle) {
                    this.targetState.value = targetState;
                }
                break;
        }
    }
}