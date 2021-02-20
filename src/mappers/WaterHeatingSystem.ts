import { Characteristic } from 'homebridge';
import HeatingSystem from './HeatingSystem';
export default class WaterHeatingSystem extends HeatingSystem {
    protected boost: Characteristic | undefined;
    
    protected registerServices() {
        if(this.device.hasSensor('TemperatureSensor')) {
            this.registerThermostatService();
            this.targetTemperature?.setProps({ minValue: 0, maxValue: 65, minStep: 1 });
        } else {
            this.registerSwitchService();
        }

        if(this.device.hasCommand('setBoostMode')) {
            const service = this.registerService(this.platform.Service.Switch);
            this.boost = service.getCharacteristic(this.platform.Characteristic.On);
        }
    }

    protected onStateChange(name: string, value) {
        this.debug(name + ' => ' + value);
        switch(name) {
            case 'core:TemperatureState': this.onTemperatureUpdate(value); break;
        }
    }
}