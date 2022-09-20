import { Characteristics } from '../../Platform';
import { Command, ExecutionState } from 'overkiz-client';
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
    private lastRefresh = Date.now();

    protected registerMainService() {
        const service = super.registerMainService();
        this.targetState?.onGet(this.refreshStates.bind(this));
        return service;
    }

    protected async refreshStates() {
        if (this.lastRefresh < Date.now() - (60 * 1000)) {
            this.lastRefresh = Date.now();
            await this.executeCommands(new Command('refreshState'));
        }
        return this.targetState?.value ?? Characteristics.TargetHeatingCoolingState.OFF;
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
        switch (name) {
            case 'core:TargetTemperatureState':
            case 'core:DerogatedTargetTemperatureState':
            case 'core:DerogationActivationState':
            case 'somfythermostat:DerogationHeatingModeState':
                this.postpone(this.computeStates);
                break;
            default:
                super.onStateChanged(name, value);
                break;
        }
    }

    protected computeStates() {
        let targetState;
        let targetTemperature;

        const derog = this.device.get('core:DerogationActivationState') === 'active';
        const mode = this.device.get(derog ? 'somfythermostat:DerogationHeatingModeState' : 'somfythermostat:HeatingModeState');
        switch (mode) {
            case 'atHomeMode':
            case 'geofencingMode':
            case 'manualMode':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                targetState = derog ? Characteristics.TargetHeatingCoolingState.HEAT : Characteristics.TargetHeatingCoolingState.AUTO;
                break;
            case 'sleepingMode':
            case 'suddenDropMode':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                targetState = derog ? Characteristics.TargetHeatingCoolingState.COOL : Characteristics.TargetHeatingCoolingState.AUTO;
                break;
            case 'awayMode':
            case 'freezeMode':
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                targetState = Characteristics.TargetHeatingCoolingState.OFF;
                break;
        }

        switch (mode) {
            case 'atHomeMode':
                targetTemperature = this.device.get('somfythermostat:AtHomeTargetTemperatureState');
                break;
            case 'geofencingMode':
                targetTemperature = this.device.get('somfythermostat:GeofencingModeTargetTemperatureState');
                break;
            case 'manualMode':
                targetTemperature = this.device.get('somfythermostat:ManualModeTargetTemperatureState');
                break;
            case 'sleepingMode':
                targetTemperature = this.device.get('somfythermostat:SleepingModeTargetTemperatureState');
                break;
            case 'suddenDropMode':
                targetTemperature = this.device.get('somfythermostat:SuddenDropModeTargetTemperatureState');
                break;
            case 'awayMode':
                targetTemperature = this.device.get('somfythermostat:AwayModeTargetTemperatureState');
                break;
            case 'freezeMode':
                targetTemperature = this.device.get('somfythermostat:FreezeModeTargetTemperatureState');
                break;
        }
        if (targetTemperature === undefined || targetTemperature === null) {
            targetTemperature = this.device.get(derog ? 'core:DerogatedTargetTemperatureState' : 'core:TargetTemperatureState');
        }

        if (this.targetTemperature !== undefined && targetTemperature !== undefined) {
            this.targetTemperature.updateValue(targetTemperature);
        }

        if (this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}