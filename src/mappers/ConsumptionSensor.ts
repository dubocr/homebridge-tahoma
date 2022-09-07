import { Service } from 'homebridge';
import Mapper from '../Mapper';

export default class ConsumptionSensor extends Mapper {
    protected registerMainService(): Service {
        throw new Error('ConsumptionSensor not implemented.');
    }

    protected onStateChanged(name: string, value: any) {
        this.info(name + ' => ' + value);
    }
}