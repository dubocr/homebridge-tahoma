import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

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