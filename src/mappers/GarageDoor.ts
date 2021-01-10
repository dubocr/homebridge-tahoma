import Mapper from '../Mapper';

export default class GarageDoor extends Mapper {
    build() {
        const service = this.accessory.getService(this.platform.Service.GarageDoorOpener) || this.accessory.addService(this.platform.Service.GarageDoorOpener);
        service.getCharacteristic(this.platform.Characteristic.TargetPosition).on('set', (value, callabck) => {
            this.platform.log.debug('Target: ' + value);
            callabck('Unable to connect');
        });
    }
}