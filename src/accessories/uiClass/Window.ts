import OverkizAccessory from '../OverkizAccessory';

export default class Window extends OverkizAccessory {
    build() {
        const service = this.accessory.getService(this.platform.Service.Window) || this.accessory.addService(this.platform.Service.Window);
    }
}