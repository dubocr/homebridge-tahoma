import RollerShutter from './RollerShutter';
import { Command } from 'overkiz-client';

export default class Awning extends RollerShutter {
    protected getTargetCommands(value) {
        if(this.stateless) {
            if(value === 0) {
                return new Command('close');
            } else if(value === 100) {
                return new Command('open');
            } else {
                if(this.movementDuration > 0) {
                    const delta = value - Number(this.currentPosition!.value);
                    const duration = Math.round(this.movementDuration * Math.abs(delta) * 1000 / 100);
                    setTimeout(() => {
                        this.cancelExecution();
                    }, duration);
                    return new Command(delta > 0 ? 'close' : 'open');
                } else {
                    return new Command('my');
                }
            }
        } else {
            return new Command('setClosure', this.reversedValue(value));
        }
    }

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