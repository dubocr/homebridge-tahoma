import { Command } from 'overkiz-client';
import VenetianBlind from './VenetianBlind';

export default class AdjustableSlatsRollerShutter extends VenetianBlind {

    protected getTargetCommands(value) {
        if(this.blindMode) {
            if(value === 100) {
                return new Command('setClosure', 0);
            } else {
                return new Command('setClosureOrOrientation', [100, this.reversedValue(value)]);
            }
        } else {
            return new Command('setClosureOrOrientation', [
                this.reversedValue(value),
                this.angleToOrientation(this.targetAngle?.value),
            ]);
        }
    }

    protected getTargetAngleCommands(value) {
        return new Command('setClosureOrOrientation', [
            this.reversedValue(this.targetPosition?.value),
            this.angleToOrientation(value),
        ]);
    }

    protected onStateChanged(name, value) {
        super.onStateChanged(name, value);

        switch(name) {
            case 'core:ClosureOrRockerPositionState':
                this.currentPosition?.updateValue(this.reversedValue(value));
                if(!this.device.hasState('core:TargetClosureState')) {
                    this.targetPosition?.updateValue(this.reversedValue(value));
                }
                break;
            default: break;
        }
    }
}