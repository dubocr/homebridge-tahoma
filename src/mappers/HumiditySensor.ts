import { Characteristics, Services } from '../Platform.js';
import { Characteristic } from 'homebridge';
import Mapper from '../Mapper.js';

export default class HumiditySensor extends Mapper {
    protected humidity: Characteristic | undefined;

    protected registerMainService() {
        const service = this.registerService(Services.HumiditySensor);
        this.humidity = service.getCharacteristic(Characteristics.CurrentRelativeHumidity);
        return service;
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:RelativeHumidityState':
                this.humidity?.updateValue(value);
                break;
        }
    }
}