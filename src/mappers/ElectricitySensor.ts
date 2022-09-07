import { Service } from 'homebridge';
import Mapper from '../Mapper';

export default class ElectricitySensor extends Mapper {
    protected registerMainService(): Service {
        throw new Error('Method not implemented.');
    }

    protected onStateChanged(name: string, value: any) {
        this.info(name + ' => ' + value);
    }
}