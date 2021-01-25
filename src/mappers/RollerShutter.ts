import Window from './Window';

export default class RollerShutter extends Window {
    registerServices() {
        return [ this.platform.Service.WindowCovering ];
    }

    registerCharacteristics() {
        const service = this.registerService(this.platform.Service.WindowCovering);
        this.currentPosition = service.getCharacteristic(this.platform.Characteristic.CurrentPosition);
        this.targetPosition = service.getCharacteristic(this.platform.Characteristic.TargetPosition);
        this.positionState = service.getCharacteristic(this.platform.Characteristic.PositionState);
        this.obstructionDetected = service.getCharacteristic(this.platform.Characteristic.ObstructionDetected);
        this.targetPosition.on('set', this.debounce(this.setTargetPosition));
    }
}