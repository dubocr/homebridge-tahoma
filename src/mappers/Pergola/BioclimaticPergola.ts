import { Command } from 'overkiz-client';
import Pergola from '../Pergola';

export default class BioclimaticPergola extends Pergola {
    protected getTargetCommands(value) {
        return new Command('setOrientation', this.reversedValue(value));
    }

    protected onStateChanged(name, value) {
        switch(name) {
            case 'core:SlatsOrientationState':
                this.currentPosition?.updateValue(this.reversedValue(value));
                if(this.isIdle) {
                    this.targetPosition?.updateValue(this.reversedValue(value));
                }
                break;
            default: break;
        }
    }
}