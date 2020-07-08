import OverkizAccessory from '../OverkizAccessory';

export default class HeatingSystem extends OverkizAccessory {
    build() {
        const service = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat);
    }
}