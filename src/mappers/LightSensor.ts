import { Characteristics, Services } from '../Platform.js';
import { Characteristic } from 'homebridge';
import Mapper from '../Mapper.js';

export default class LightSensor extends Mapper {
    protected lightLevel: Characteristic | undefined;

    protected registerMainService() {
        const service = this.registerService(Services.LightSensor);
        this.lightLevel = service.getCharacteristic(Characteristics.CurrentAmbientLightLevel);
        return service;
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:LuminanceState':
                this.lightLevel?.updateValue(value);
                break;
        }
    }
}