import { Characteristics } from '../../Platform';
import { Characteristic } from 'homebridge';
import { Command } from 'overkiz-client';
import WaterHeatingSystem from '../WaterHeatingSystem';
import { ShowersCharacteristic } from '../../CustomCharacteristics';

export default class DomesticHotWaterProduction extends WaterHeatingSystem {
    protected showers: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerThermostatService();
        this.registerSwitchService('boost');
        if(this.device.hasState('core:NumberOfShowerRemainingState')) {
            this.showers = this.registerCharacteristic(service, ShowersCharacteristic);
        }
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
                    return new Command('setAbsenceMode', 'on');
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
        switch(name) {
            case 'io:DHWBoostModeState':
                this.on?.updateValue(value === 'on');
                break;
            case 'core:WaterTemperatureState':
                if(!this.device.hasState('io:MiddleWaterTemperatureState')) {
                    this.currentTemperature?.updateValue(value);
                }
                break;
            case 'io:MiddleWaterTemperatureState':
                this.currentTemperature?.updateValue(value);
                break;
            case 'core:WaterTargetTemperatureState':
                this.targetTemperature?.updateValue(value);
                break;
            case 'io:DHWModeState':
            case 'io:DHWAbsenceModeState':
                this.postpone(this.computeStates);
                break;
            case 'core:NumberOfShowerRemainingState':
                this.showers?.updateValue(value);
                break;
        }
    }

    protected computeStates() {
        let targetState;
        if(this.device.get('io:DHWAbsenceModeState') === 'off') {
            switch(this.device.get('io:DHWModeState')) {
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
        } else {
            targetState = Characteristics.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
        }
        if(this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.value = targetState;
        }
    }
}