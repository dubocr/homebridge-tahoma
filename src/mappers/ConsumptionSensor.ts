import { Service } from 'homebridge';
import Mapper from '../Mapper.js';

export default class ConsumptionSensor extends Mapper {
    protected registerMainService(): Service {
        throw new Error('ConsumptionSensor not implemented.');
    }

    protected onStateChanged(name: string, value: any) {
        this.info(name + ' => ' + value);
    }
}