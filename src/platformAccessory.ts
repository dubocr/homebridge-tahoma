import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { OverkizPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class OverkizAccessory {
    private service: Service;

    constructor(private readonly platform: OverkizPlatform, private readonly accessory: PlatformAccessory) {
        this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    }
}