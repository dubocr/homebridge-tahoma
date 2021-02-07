import Window from './Window';

export default class RollerShutter extends Window {

    protected registerServices() {
        const service = this.registerService(this.platform.Service.WindowCovering);
        this.currentPosition = service.getCharacteristic(this.platform.Characteristic.CurrentPosition);
        this.targetPosition = service.getCharacteristic(this.platform.Characteristic.TargetPosition);
        this.positionState = service.getCharacteristic(this.platform.Characteristic.PositionState);
        this.obstructionDetected = service.getCharacteristic(this.platform.Characteristic.ObstructionDetected);
        this.targetPosition.on('set', this.debounce(this.setTargetPosition));

        /*this.on(
            'core:ClosureState',
            (value) => this.currentPosition?.updateValue(this.reverse ? value : (100-value)),
        );
        this.on(
            'core:TargetClosureState', 
            (value) => this.targetPosition?.updateValue(this.reverse ? value : (100-value)),
        );*/
    }

    protected onStateChange(name: string, value) {
        switch(name) {
            case 'core:ClosureState':
                this.currentPosition?.updateValue(this.reverse ? value : (100-value));
                break;
            case 'core:TargetClosureState':
                this.targetPosition?.updateValue(this.reverse ? value : (100-value));
                break;
        }
    }
}