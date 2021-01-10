import Mapper from '../Mapper';

export default class HeatingSystem extends Mapper {
    build() {
        const service = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat);
    }
}