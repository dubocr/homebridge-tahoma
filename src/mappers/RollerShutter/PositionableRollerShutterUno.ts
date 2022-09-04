import RollerShutter from '../RollerShutter';
export default class PositionableRollerShutterUno extends RollerShutter {
    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:TargetClosureState':
                if(this.isIdle) {
                    this.targetPosition?.updateValue(this.reversedValue(value));
                }
                this.currentPosition?.updateValue(this.reversedValue(value));
                break;
        }
    }
}