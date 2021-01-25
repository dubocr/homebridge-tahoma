import Mapper from '../Mapper';

export default class HeatingSystem extends Mapper {
    protected currentTemperature;

    protected buildServices() {
        const temperatureSensor = this.device.sensors.find((sensor) => sensor.uiClass === 'TemperatureSensor');
        if(temperatureSensor) {
            const service = this.registerService(this.platform.Service.Thermostat);
            this.currentTemperature = service.getCharacteristic(this.platform.Characteristic.CurrentTemperature);
        } else {
            //const service = this.registerService(this.platform.Service.Switch);
        }
    }

    protected onStateChange(name: string, value) {
        switch(name) {
            case 'core:TemperatureState': this.currentTemperature.updateValue(value > 273.15 ? (value - 273.15) : value); break;
        }
    }
}