import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import Alarm from '../Alarm';

export default class MyFoxAlarmController extends Alarm {
    protected getTargetCommands(value): Command | Array<Command> {
        switch(value) {
            default:
            case Characteristics.SecuritySystemTargetState.STAY_ARM:
                return [];
            case Characteristics.SecuritySystemTargetState.NIGHT_ARM:
                return new Command('partial');
            case Characteristics.SecuritySystemTargetState.AWAY_ARM:
                return new Command('arm');
            case Characteristics.SecuritySystemTargetState.DISARM:
                return new Command('disarm');
        }
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'myfox:AlarmStatusState':
                switch(value) {
                    default:
                    case 'disarmed': 
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.DISARMED);
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.DISARM);
                        break;
                    case 'armed': 
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.AWAY_ARM);
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.AWAY_ARM);
                        break;
                    case 'partial': 
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.NIGHT_ARM);
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.NIGHT_ARM);
                        break;
                }
                break;
        }
    }
}