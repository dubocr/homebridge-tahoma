import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class WaterHeatingSystem extends Mapper {
    protected on: Characteristic | undefined;
    protected boost: Characteristic | undefined;
    
    protected registerServices() {
        const service = this.registerService(this.platform.Service.Switch);
        this.on = service.getCharacteristic(this.platform.Characteristic.On);

        if(this.device.hasCommand('setBoostMode')) {
            const service = this.registerService(this.platform.Service.Switch);
            this.boost = service.getCharacteristic(this.platform.Characteristic.On);
        }
    }
}