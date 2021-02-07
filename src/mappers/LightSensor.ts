import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class LightSensor extends Mapper {
    protected lightLevel: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(this.platform.Service.LightSensor);
        this.lightLevel = service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel);

        this.device.on('core:LuminanceState', this.lightLevel.updateValue);
    }

}