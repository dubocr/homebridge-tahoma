import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import Alarm from '../Alarm';

export default class TSKAlarmController extends Alarm {
    protected getTargetCommands(value): Command | Array<Command> {
        switch(value) {
            default:
            case Characteristics.SecuritySystemTargetState.STAY_ARM:
                return new Command('alarmPartial1');
            case Characteristics.SecuritySystemTargetState.NIGHT_ARM:
                return new Command('alarmPartial2');
            case Characteristics.SecuritySystemTargetState.AWAY_ARM:
                return new Command('alarmOn');
            case Characteristics.SecuritySystemTargetState.DISARM:
                return new Command('alarmOff');
        }
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'internal:CurrentAlarmModeState':
                switch(value) {
                    default:
                    case 'off': 
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.DISARMED);
                        break;
                    case 'partial1':
                    case 'zone1': 
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.STAY_ARM);
                        break;
                    case 'total': 
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.AWAY_ARM);
                        break;
                    case 'partial2':
                    case 'zone2': 
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.NIGHT_ARM);
                        break;
                }
                break;
            
            case 'internal:TargetAlarmModeState':
                switch(value) {
                    default:
                    case 'off': 
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.DISARM);
                        break;
                    case 'partial1':
                    case 'zone1': 
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.STAY_ARM);
                        break;
                    case 'total': 
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.AWAY_ARM);
                        break;
                    case 'partial2':
                    case 'zone2': 
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.NIGHT_ARM);
                        break;
                }
                break;
        }
    }
}