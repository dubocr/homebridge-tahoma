import Awning from '../Awning.js';
export default class PositionableHorizontalAwningUno extends Awning {
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