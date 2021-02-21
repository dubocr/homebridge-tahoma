import { Command } from 'overkiz-client';
import Alarm from '../Alarm';

export default class MyFoxAlarmController extends Alarm {
    protected getTargetCommands(value): Command | Array<Command> {
        switch(value) {
            default:
            case this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM:
                return [];
            case this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                return new Command('partial');
            case this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM:
                return new Command('arm');
            case this.platform.Characteristic.SecuritySystemTargetState.DISARM:
                return new Command('disarm');
        }
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'myfox:AlarmStatusState':
                switch(value) {
                    default:
                    case 'disarmed': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.DISARMED);
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.DISARM);
                        break;
                    case 'armed': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM);
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM);
                        break;
                    case 'partial': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM);
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM);
                        break;
                }
                break;
        }
    }
}