import { Characteristics } from '../../Platform';
import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import WaterHeatingSystem from '../WaterHeatingSystem';
import { CurrentShowerCharacteristic, TargetShowerCharacteristic } from '../../CustomCharacteristics';

export default class DomesticHotWaterProduction extends WaterHeatingSystem {
    protected THERMOSTAT_CHARACTERISTICS = ['eco'];
    protected currentShower: Characteristic | undefined;
    protected targetShower: Characteristic | undefined;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.HEAT,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected registerServices() {
        const service = this.registerThermostatService();
        service.addOptionalCharacteristic(TargetShowerCharacteristic);
        service.addOptionalCharacteristic(CurrentShowerCharacteristic);
        this.registerSwitchService('boost');
        if (this.device.hasState('core:NumberOfShowerRemainingState')) {
            this.currentShower = service.getCharacteristic(CurrentShowerCharacteristic);
            this.targetShower = service.getCharacteristic(TargetShowerCharacteristic);
            this.targetShower.setProps({
                minValue: this.device.getNumber('core:MinimalShowerManualModeState'),
                maxValue: this.device.getNumber('core:MaximalShowerManualModeState'),
            });
            this.targetShower.onSet(this.setTargetShower.bind(this));
        }
    }

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        const commands = Array<Command>();
        if (this.device.hasCommand('setDHWMode')) {
            if (this.targetState?.value === Characteristics.TargetHeatingCoolingState.OFF) {
                commands.push(new Command('setAbsenceMode', 'off'));
            }
            switch (value) {
                case Characteristics.TargetHeatingCoolingState.AUTO:
                    commands.push(new Command('setDHWMode', 'autoMode'));
                    break;
                case Characteristics.TargetHeatingCoolingState.HEAT:
                    if (this.eco?.value) {
                        commands.push(new Command('setDHWMode', 'manualEcoActive'));
                    } else {
                        commands.push(new Command('setDHWMode', 'manualEcoInactive'));
                    }
                    break;
                case Characteristics.TargetHeatingCoolingState.OFF:
                    commands.push(new Command('setAbsenceMode', 'on'));
                    break;
            }
            return commands;
        } else if (this.device.hasCommand('setCurrentOperatingMode')) {
            switch (value) {
                case Characteristics.TargetHeatingCoolingState.AUTO:
                    return new Command('setCurrentOperatingMode', { 'relaunch': 'off', 'absence': 'off' });
                case Characteristics.TargetHeatingCoolingState.HEAT:
                    return new Command('setCurrentOperatingMode', { 'relaunch': 'on', 'absence': 'off' });
                case Characteristics.TargetHeatingCoolingState.OFF:
                    return new Command('setCurrentOperatingMode', { 'relaunch': 'off', 'absence': 'on' });
            }
        } else if (this.device.hasCommand('setBoostModeDuration')) {
            switch (value) {
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
        } else if (this.device.hasCommand('setBoostMode')) {
            switch (value) {
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

    async setTargetShower(value) {
        const previous = this.targetShower?.value;
        const action = await this.executeCommands(new Command('setExpectedNumberOfShower', value));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.FAILED:
                    if (previous) {
                        this.targetShower?.updateValue(previous);
                    }
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'io:DHWBoostModeState':
            case 'modbuslink:DHWBoostModeState':
                this.on?.updateValue(value !== 'off');
                break;
            case 'core:WaterTemperatureState':
                if (!this.device.hasState('io:MiddleWaterTemperatureState')) {
                    this.currentTemperature?.updateValue(value);
                }
                break;
            case 'io:MiddleWaterTemperatureState':
            case 'modbuslink:MiddleWaterTemperatureState':
                this.currentTemperature?.updateValue(value);
                break;
            case 'core:TargetTemperatureState':
            case 'core:WaterTargetTemperatureState':
                this.targetTemperature?.updateValue(value);
                break;
            case 'io:DHWModeState':
            case 'io:DHWAbsenceModeState':
                this.postpone(this.computeStates, 'io');
                break;
            case 'modbuslink:DHWModeState':
            case 'modbuslink:DHWAbsenceModeState':
                this.postpone(this.computeStates, 'modbuslink');
                break;
            case 'core:NumberOfShowerRemainingState':
                this.currentShower?.updateValue(value);
                break;
            case 'core:ExpectedNumberOfShowerState':
                this.targetShower?.updateValue(value);
                break;
        }
    }

    protected computeStates(protcol) {
        let targetState;
        if (this.device.get(protcol+':DHWAbsenceModeState') === 'off') {
            switch (this.device.get(protcol+':DHWModeState')) {
                case 'autoMode':
                    targetState = Characteristics.TargetHeatingCoolingState.AUTO;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    break;
                case 'manualEcoInactive':
                    this.eco?.updateValue(false);
                    targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    break;
                case 'manualEcoActive':
                    this.eco?.updateValue(true);
                    targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                    break;
            }
        } else {
            targetState = Characteristics.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
        }
        if (this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}