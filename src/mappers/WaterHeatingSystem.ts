import { Service } from 'homebridge';
import HeatingSystem from './HeatingSystem';

export default class WaterHeatingSystem extends HeatingSystem {
    protected registerThermostatService(subtype?: string): Service {
        const service = super.registerThermostatService(subtype);
        this.targetTemperature?.setProps({ minValue: 0, maxValue: 65, minStep: 1 });
        this.targetState?.setProps({ validValues: [
            this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
            this.platform.Characteristic.TargetHeatingCoolingState.OFF,
        ] });
        return service;
    }
}