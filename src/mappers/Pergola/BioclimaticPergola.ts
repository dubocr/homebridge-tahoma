import { Command } from 'overkiz-client';
import Pergola from '../Pergola';

export default class BioclimaticPergola extends Pergola {
    protected getTargetCommands(value) {
        return new Command('setOrientation', this.reversedValue(value));
    }
}