import moment from 'moment';
import { Command } from 'overkiz-client';
import RollerShutter from '../RollerShutter';
export default class PositionableRollerShutterWithLowSpeedManagement extends RollerShutter {
    protected lowSpeed;

    protected applyConfig(config) {
        this.lowSpeed = config['lowSpeed'] || false;
    }

    protected getTargetCommands(value) {
        if (this.isLowSpeed) {
            return new Command('setClosureAndLinearSpeed', [this.reversedValue(value), 'lowspeed']);
        } else {
            return new Command('setClosure', this.reversedValue(value));
        }
    }

    protected get isLowSpeed() {
        if (this.lowSpeed === true) {
            return true;
        } else if (typeof this.lowSpeed === 'string') {
            const parts = this.lowSpeed.split(new RegExp('[-:]'));
            const now = moment();
            const start = moment();
            const end = moment();
            start.set({ 'hour': parseInt(parts[0]), 'minute': parseInt(parts[1]), 'second': 0, 'millisecond': 0 });
            end.set({ 'hour': parseInt(parts[2]), 'minute': parseInt(parts[3]), 'second': 0, 'millisecond': 0 });
            if (end.isBefore(start)) {
                return now.isAfter(start) || now.isBefore(end);
            } else {
                return now.isBetween(start, end);
            }
        } else {
            return false;
        }
    }
}