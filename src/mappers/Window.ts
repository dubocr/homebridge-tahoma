import RollerShutter from './RollerShutter';
import { Characteristics, Services } from '../Platform';

export default class Window extends RollerShutter {
    protected registerMainService() {
        const service = this.registerService(Services.Window);
        this.currentPosition = service.getCharacteristic(Characteristics.CurrentPosition);
        this.targetPosition = service.getCharacteristic(Characteristics.TargetPosition);
        this.positionState = service.getCharacteristic(Characteristics.PositionState);
        if (this.stateless) {
            this.currentPosition.updateValue(this.initPosition);
            this.targetPosition.updateValue(this.initPosition);
        } else {
            this.obstructionDetected = service.getCharacteristic(Characteristics.ObstructionDetected);
        }
        this.positionState.updateValue(Characteristics.PositionState.STOPPED);
        this.targetPosition.onSet(this.debounce(this.setTargetPosition));
        return service;
    }
}