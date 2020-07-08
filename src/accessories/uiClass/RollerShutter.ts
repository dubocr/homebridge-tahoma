import OverkizAccessory from '../OverkizAccessory';

export default class RollerShutter extends OverkizAccessory {
    build() {
        const service = this.accessory.getService(this.platform.Service.WindowCovering) || this.accessory.addService(this.platform.Service.WindowCovering);
    }
}