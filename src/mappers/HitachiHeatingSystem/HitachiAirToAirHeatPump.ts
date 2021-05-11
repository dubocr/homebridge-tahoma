import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class HitachiAirToAirHeatPump extends HeatingSystem {
    protected MIN_TEMP = 16;
    protected MAX_TEMP = 30;
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
        return this.getCommands(value, this.targetTemperature?.value);
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        return this.getCommands(this.targetState?.value, value);
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'ovp:ModeChangeState':
            case 'ovp:MainOperationState':
                if (this.device.get('ovp:MainOperationState') === 'Off' || this.device.get('ovp:MainOperationState') === 'off') {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                    this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.OFF);
                } else {
                    switch (this.device.get('ovp:ModeChangeState')?.toLowerCase()) {
                        case 'auto cooling':
                            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                            this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.AUTO);
                            break;
                        case 'auto heating':
                            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                            this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.AUTO);
                            break;
                        case 'cooling':
                            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                            this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.COOL);
                            break;
                        case 'heating':
                            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                            this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.HEAT);
                            break;
                    }
                }
                break;
            case 'ovp:RoomTemperatureState': this.onTemperatureUpdate(value); break;
            case 'core:TargetTemperatureState':
                this.targetTemperature?.updateValue(value);
                break;
            /*
            case 'ovp:TemperatureChangeState':
                if(value <= 5 && this.currentTemperature) {
                    this.targetTemperature?.updateValue(this.currentTemperature.value + value);
                } else {
                    this.targetTemperature?.updateValue(value);
                }
                break;
            */
        }
    }

    private getCommands(state, temperature) {
        const currentState = this.currentState ? this.currentState.value : 0;
        const currentTemperature = this.currentTemperature && this.currentTemperature.value !== null ? this.currentTemperature.value : 0;
        let onOff = 'on';
        const fanMode = 'auto';
        const progMode = 'manu';
        let heatMode = 'auto';
        const autoTemp = Math.trunc(Math.max(Math.min(temperature - parseInt(currentTemperature.toString()), 5), -5));

        switch (state) {
            case Characteristics.TargetHeatingCoolingState.OFF:
                onOff = 'off';
                switch (currentState) {
                    case Characteristics.CurrentHeatingCoolingState.HEAT:
                        heatMode = 'heating';
                        break;
                    case Characteristics.CurrentHeatingCoolingState.COOL:
                        heatMode = 'cooling';
                        break;
                    default:
                        temperature = autoTemp;
                        break;
                }
                break;

            case Characteristics.TargetHeatingCoolingState.HEAT:
                heatMode = 'heating';
                break;

            case Characteristics.TargetHeatingCoolingState.COOL:
                heatMode = 'cooling';
                break;

            case Characteristics.TargetHeatingCoolingState.AUTO:
                heatMode = 'auto';
                temperature = autoTemp;
                break;

            default:
                temperature = autoTemp;
                break;
        }

        temperature = Math.round(temperature);
        this.debug('FROM ' + currentState + '/' + currentTemperature + ' TO ' + state + '/' + temperature);

        return new Command('globalControl', [onOff, temperature, fanMode, heatMode, progMode]);
    }
}