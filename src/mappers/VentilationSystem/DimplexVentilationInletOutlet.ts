
import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import VentilationSystem from '../VentilationSystem';

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