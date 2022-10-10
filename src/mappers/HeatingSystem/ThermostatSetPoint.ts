import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class ThermostatSetPoint extends HeatingSystem {
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
    ];

    protected registerMainService() {
        const service = super.registerMainService();
        this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.AUTO);
        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
        return service;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        return new Command('setHeatingTargetTemperature', value);
    }

    protected onStateChanged(name, value) {
        switch (name) {
            case 'zwave:SetPointHeatingValueState':
            case 'core:RoomTemperatureState':
                this.onTemperatureUpdate(value);
                break;
            case 'core:HeatingTargetTemperatureState':
                this.targetTemperature?.updateValue(value);
                break;
            default:
                super.onStateChanged(name, value);
                break;
        }
    }
}