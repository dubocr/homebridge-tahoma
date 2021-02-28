
import { Command } from 'overkiz-client';
import VentilationSystem from '../VentilationSystem';

export default class DimplexVentilationInletOutlet extends VentilationSystem {
    protected getTargetStateCommands(value): Command | Array<Command> {
        switch(value) {
            case this.platform.Characteristic.TargetAirPurifierState.AUTO:
                return new Command('auto');
            case this.platform.Characteristic.TargetAirPurifierState.MANUAL:
            default:
                return new Command('max');
        }
    }
}