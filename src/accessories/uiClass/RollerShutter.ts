import OverkizAccessory from '../OverkizAccessory';

export default class RollerShutter extends OverkizAccessory {
    build() {
        const service = this.accessory.getService(this.platform.Service.WindowCovering) || this.accessory.addService(this.platform.Service.WindowCovering);
        service.getCharacteristic(this.platform.Characteristic.TargetPosition).on('set', (value, callabck) => {
            this.platform.log.debug('Target: ' + value);
            callabck('Unable to connect');
        });
    }
}