import { Characteristics, Services } from '../Platform';
import { Service } from 'homebridge';
import HeatingSystem from './HeatingSystem';

export default class WaterHeatingSystem extends HeatingSystem {
    protected registerThermostatService(subtype?: string): Service {
        const service = super.registerThermostatService(subtype);
        service.setPrimaryService(true);
        this.targetTemperature?.setProps({ minValue: 45, maxValue: 65, minStep: 1 });
        this.targetState?.setProps({ validValues: [
            Characteristics.TargetHeatingCoolingState.AUTO,
            Characteristics.TargetHeatingCoolingState.HEAT,
            Characteristics.TargetHeatingCoolingState.COOL,
            Characteristics.TargetHeatingCoolingState.OFF,
        ] });
        if(this.targetTemperature && this.targetTemperature.value! < 45) {
            this.targetTemperature.value = 45;
        }
        return service;
    }
}