
import { Characteristics, Services } from '../Platform';
import { Characteristic, Service } from 'homebridge';
import Mapper from '../Mapper';

export default class AirSensor extends Mapper {
    protected quality: Characteristic | undefined;

    protected registerMainService(): Service {
        const service = this.registerService(Services.AirQualitySensor);
        this.quality = service.getCharacteristic(Characteristics.AirQuality);
        return service;
    }
    
    protected onStateChanged(name: string, value) {
        switch(name) {
            default: this.quality?.updateValue(value);
        }
    }
}