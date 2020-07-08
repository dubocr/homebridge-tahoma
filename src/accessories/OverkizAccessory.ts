import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { OverkizPlatform } from '../platform';
import OverkizDevice from '../api/OverkizDevice';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export default class OverkizAccessory {
    constructor(protected readonly platform: OverkizPlatform, protected readonly device: OverkizDevice, protected readonly accessory: PlatformAccessory) {
        const info = this.accessory.getService(this.platform.Service.AccessoryInformation);
        if(info) {
            info.setCharacteristic(this.platform.Characteristic.Manufacturer, device.getManufacturer());
            info.setCharacteristic(this.platform.Characteristic.Model, device.getModel());
            info.setCharacteristic(this.platform.Characteristic.SerialNumber, device.getSerialNumber());
        }
        this.build();
    }

    build() {
        console.log('Nothing to build');
    }
}