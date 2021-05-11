import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class SomfyThermostat extends HeatingSystem {
    protected MIN_TEMP = 0;
    protected MAX_TEMP = 26;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.HEAT,
        Characteristics.TargetHeatingCoolingState.COOL,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected registerServices() {
        this.registerThermostatService();
    }

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return new Command('exitDerogation');

            case Characteristics.TargetHeatingCoolingState.HEAT:
                return new Command('setDerogation', ['atHomeMode', 'further_notice']);

            case Characteristics.TargetHeatingCoolingState.COOL:
                return new Command('setDerogation', ['sleepingMode', 'further_notice']);

            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setDerogation', ['awayMode', 'further_notice']);
        }
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> | undefined {
        return new Command('setDerogation', [value, 'further_notice']);
    }

    protected onStateChanged(name, value) {
        super.onStateChanged(name, value);
        switch (name) {
            case 'core:DerogationActivationState':
            case 'somfythermostat:DerogationHeatingModeState':
                this.postpone(this.computeStates);
                break;
        }
    }

    protected computeStates() {
        let targetState;

        const auto = this.device.states['core:DerogationActivationState'] === 'inactive';
        switch (this.device.states['somfythermostat:DerogationHeatingModeState']) {
            case 'atHomeMode':
            case 'geofencingMode':
            case 'manualMode':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                targetState = auto ? Characteristics.TargetHeatingCoolingState.AUTO : Characteristics.TargetHeatingCoolingState.HEAT;
                break;
            case 'sleepingMode':
            case 'suddenDropMode':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                targetState = auto ? Characteristics.TargetHeatingCoolingState.AUTO : Characteristics.TargetHeatingCoolingState.COOL;
                break;
            case 'awayMode':
            case 'freezeMode':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                targetState = Characteristics.TargetHeatingCoolingState.OFF;
                break;
        }

        if (this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}