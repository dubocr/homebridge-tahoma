import { Command } from 'overkiz-client';
import RollerShutter from '../RollerShutter';

export default class RTSGeneric extends RollerShutter {
    protected getTargetCommands(value) {
        if(value === 0) {
            return new Command('down');
        } else {
            return new Command('up');
        }
    }
}