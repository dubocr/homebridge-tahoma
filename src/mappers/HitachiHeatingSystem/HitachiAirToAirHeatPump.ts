import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class HitachiAirToAirHeatPump extends HeatingSystem {

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        return this.getCommands(value, this.targetTemperature?.getValue());
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        return this.getCommands(this.targetState?.getValue(), value);
    }

    private getCommands(state, temperature) {
        const currentState = this.currentState ? this.currentState.getValue() : 0;
        const currentTemperature = this.currentTemperature?.getValue() || 0;
        let onOff = 'on';
        const fanMode = 'auto';
        const progMode = 'manu';
        let heatMode = 'auto';
        const autoTemp = Math.trunc(Math.max(Math.min(temperature - currentTemperature, 5), -5));

        switch(state) {
            case Characteristics.TargetHeatingCoolingState.OFF:
                onOff = 'off';
                switch(currentState) {
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