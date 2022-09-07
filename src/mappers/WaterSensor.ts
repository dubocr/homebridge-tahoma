import { Characteristic } from 'homebridge';
import { Characteristics, Services } from '../Platform';
import Mapper from '../Mapper';

export default class WaterSensor extends Mapper {
    protected leak: Characteristic | undefined;

    protected registerMainService() {
        const service = this.registerService(Services.LeakSensor);
        this.leak = service.getCharacteristic(Characteristics.LeakDetected);
        return service;
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:WaterDetectionState':
                this.leak?.updateValue(
                    value === 'detected' ? Characteristics.LeakDetected.LEAK_DETECTED : Characteristics.LeakDetected.LEAK_NOT_DETECTED
                );
                break;
        }
    }
}