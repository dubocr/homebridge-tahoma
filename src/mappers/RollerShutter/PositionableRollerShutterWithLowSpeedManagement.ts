import { Command } from 'overkiz-client';
import RollerShutter from '../RollerShutter';
export default class PositionableRollerShutterWithLowSpeedManagement extends RollerShutter {
    protected lowSpeed;
    
    protected applyConfig(config) {
        this.lowSpeed = config['lowSpeed'] || false;
    }

    protected getTargetCommands(value) {
        if(this.lowSpeed) {
            return new Command('setClosureAndLinearSpeed', [this.reversedValue(value), 'lowspeed']);
        } else {
            return new Command('setClosure', this.reversedValue(value));
        }
    }
}