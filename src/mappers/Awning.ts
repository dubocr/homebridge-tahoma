import RollerShutter from './RollerShutter';

export default class Awning extends RollerShutter {
    protected reversedValue(value) {
        return this.reverse ? (100-value) : value;
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:DeploymentState':
                this.currentPosition?.updateValue(this.reversedValue(100 - value));
                if(!this.device.hasState('core:TargetClosureState')) {
                    this.targetPosition?.updateValue(this.reversedValue(100 - value));
                }
                break;
            case 'core:ClosureState':
                this.currentPosition?.updateValue(this.reversedValue(value));
                if(!this.device.hasState('core:TargetClosureState')) {
                    this.targetPosition?.updateValue(this.reversedValue(value));
                }
                break;
            case 'core:TargetClosureState':
                this.targetPosition?.updateValue(this.reversedValue(value));
                if(!this.device.hasState('core:ClosureState')) {
                    this.currentPosition?.updateValue(this.reversedValue(value));
                }
                break;
        }
    }
}