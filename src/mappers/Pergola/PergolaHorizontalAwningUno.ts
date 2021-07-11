import Pergola from '../Pergola';

export default class PergolaHorizontalAwningUno extends Pergola {
    protected onStateChanged(name: string, value) {
        // Fix (https://github.com/dubocr/homebridge-tahoma/issues/305)
        value = 100 - value;
        switch (name) {
            case 'core:ClosureState':
                this.currentPosition?.updateValue(this.reversedValue(value));
                if (!this.device.hasState('core:TargetClosureState') && this.isIdle) {
                    this.targetPosition?.updateValue(this.reversedValue(value));
                }
                break;
            case 'core:TargetClosureState':
                this.targetPosition?.updateValue(this.reversedValue(value));
                if (!this.device.hasState('core:ClosureState')) {
                    this.currentPosition?.updateValue(this.reversedValue(value));
                }
                break;
        }
    }
}