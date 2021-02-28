import RollerShutter from './RollerShutter';

export default class Window extends RollerShutter {
    protected registerServices() {
        const service = this.registerService(this.platform.Service.Window);
        this.currentPosition = service.getCharacteristic(this.platform.Characteristic.CurrentPosition);
        this.targetPosition = service.getCharacteristic(this.platform.Characteristic.TargetPosition);
        this.positionState = service.getCharacteristic(this.platform.Characteristic.PositionState);
        if(this.stateless) {
            this.currentPosition.updateValue(this.initPosition);
            this.targetPosition.updateValue(this.initPosition);
        } else {
            this.obstructionDetected = service.getCharacteristic(this.platform.Characteristic.ObstructionDetected);
        }
        this.positionState.updateValue(this.platform.Characteristic.PositionState.STOPPED);
        this.targetPosition.on('set', this.debounce(this.setTargetPosition));
    }
}