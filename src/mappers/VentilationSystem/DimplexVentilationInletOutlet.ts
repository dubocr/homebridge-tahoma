
import { Characteristics } from '../../Platform.js';
import { Command } from 'overkiz-client';
import VentilationSystem from '../VentilationSystem.js';

export default class DimplexVentilationInletOutlet extends VentilationSystem {
    protected getTargetStateCommands(value): Command | Array<Command> {
        switch(value) {
            case Characteristics.TargetAirPurifierState.AUTO:
                return new Command('auto');
            case Characteristics.TargetAirPurifierState.MANUAL:
            default:
                return new Command('max');
        }
    }
}