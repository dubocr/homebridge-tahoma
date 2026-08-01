import { Characteristics, Services } from '../Platform.js';
import { Service } from 'homebridge';
import Mapper from '../Mapper.js';

export default class ElectricitySensor extends Mapper {
    protected registerMainService(): Service {
        const service = this.registerService(Services.AccessoryMetrics);
        return service;
    }

    protected onStateChanged(name: string, value: any) {
        this.info(name + ' => ' + value);
    }
}