import { Characteristics, Services } from '../Platform';
import { Service } from 'homebridge';
import HeatingSystem from './HeatingSystem';

export default class WaterHeatingSystem extends HeatingSystem {
    protected registerThermostatService(subtype?: string): Service {
        const service = super.registerThermostatService(subtype);
        this.targetTemperature?.setProps({ minValue: 0, maxValue: 65, minStep: 1 });
        this.targetState?.setProps({ validValues: [
            Characteristics.TargetHeatingCoolingState.AUTO,
            Characteristics.TargetHeatingCoolingState.OFF,
        ] });
        return service;
    }
}