import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class HumiditySensor extends Mapper {
    protected humidity: Characteristic | undefined;
    
    protected registerServices() {
        const service = this.registerService(this.platform.Service.HumiditySensor);
        this.humidity = service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity);
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:RelativeHumidityState':
                this.humidity?.updateValue(value);
                break;
        }
    }
}