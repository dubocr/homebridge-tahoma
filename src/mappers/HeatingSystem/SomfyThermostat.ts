import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class SomfyThermostat extends HeatingSystem {   
    
    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ minValue: 0, maxValue: 26, minStep: 0.5 });
    }

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        switch(value) {
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
        switch(name) {
            case 'core:DerogationActivationState':
            case 'somfythermostat:DerogationHeatingModeState':
                this.postpone(this.computeStates);
                break;
        }
    }

    protected computeStates() {
        let targetState;

        const auto = this.device.states['core:DerogationActivationState'] === 'inactive';
        switch(this.device.states['somfythermostat:DerogationHeatingModeState']) {
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

        if(this.targetState !== undefined && targetState !== undefined && this.device.isIdle) {
            this.targetState.value = targetState;
        }
    }
}