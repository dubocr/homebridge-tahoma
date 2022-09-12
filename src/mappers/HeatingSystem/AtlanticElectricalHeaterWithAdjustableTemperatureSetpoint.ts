import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint extends HeatingSystem {
    protected THERMOSTAT_CHARACTERISTICS = ['prog'];
    protected MIN_TEMP = 16;
    protected MAX_TEMP = 28;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected registerMainService() {
        if (this.device.get('io:NativeFunctionalLevelState') === 'Top') {
            this.TARGET_MODES.push(Characteristics.TargetHeatingCoolingState.HEAT);
        }
        return super.registerMainService();
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                if (this.device.get('io:NativeFunctionalLevelState') === 'Top') {
                    return new Command('setOperatingMode', 'auto');
                } else {
                    return new Command('setOperatingMode', this.prog?.value ? 'internal' : 'basic');
                }
            case Characteristics.TargetHeatingCoolingState.HEAT:
                if (this.device.get('io:NativeFunctionalLevelState') === 'Top') {
                    return new Command('setOperatingMode', this.prog?.value ? 'internal' : 'basic');
                }
                break;
            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setOperatingMode', 'standby');
        }
        return [];
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> | undefined {
        if (this.prog?.value) {
            return new Command('setDerogatedTargetTemperature', value);
        } else {
            return new Command('setTargetTemperature', value);
        }
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:TemperatureState':
                this.onTemperatureUpdate(value);
                break;
            case 'io:EffectiveTemperatureSetpointState':
            case 'core:TargetTemperatureState':
            case 'io:TargetHeatingLevelState':
            case 'core:OperatingModeState':
                this.postpone(this.computeStates);
                break;
        }
    }

    protected computeStates() {
        let targetState;
        targetState = Characteristics.TargetHeatingCoolingState.AUTO;
        switch (this.device.get('core:OperatingModeState')) {
            case 'off':
            case 'away':
            case 'frostprotection':
            case 'standby':
                targetState = Characteristics.TargetHeatingCoolingState.OFF;
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
                break;
            case 'auto':
                this.prog?.updateValue(false);
                if (this.device.get('io:TargetHeatingLevelState') === 'eco') {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                } else {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                }
                this.targetTemperature?.updateValue(this.device.get('io:EffectiveTemperatureSetpointState'));
                break;
            case 'prog':
            case 'program':
            case 'internal':
            case 'comfort':
            case 'eco':
            case 'manual':
            case 'basic':
                if (this.device.get('io:NativeFunctionalLevelState') === 'Top') {
                    targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                }
                this.prog?.updateValue(['prog', 'program', 'internal'].includes(this.device.get('core:OperatingModeState')));
                if (this.device.get('io:TargetHeatingLevelState') === 'eco') {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                } else {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                }
                this.targetTemperature?.updateValue(this.device.get('io:EffectiveTemperatureSetpointState'));
                break;
        }

        if (this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}