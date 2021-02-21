import { Command } from 'overkiz-client';
import Alarm from '../Alarm';

export default class TSKAlarmController extends Alarm {
    protected getTargetCommands(value): Command | Array<Command> {
        switch(value) {
            default:
            case this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM:
                return new Command('alarmPartial1');
            case this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                return new Command('alarmPartial2');
            case this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM:
                return new Command('alarmOn');
            case this.platform.Characteristic.SecuritySystemTargetState.DISARM:
                return new Command('alarmOff');
        }
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'internal:CurrentAlarmModeState':
                switch(value) {
                    default:
                    case 'off': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.DISARMED);
                        break;
                    case 'partial1':
                    case 'zone1': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM);
                        break;
                    case 'total': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM);
                        break;
                    case 'partial2':
                    case 'zone2': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM);
                        break;
                }
                break;
            
            case 'internal:TargetAlarmModeState':
                switch(value) {
                    default:
                    case 'off': 
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.DISARM);
                        break;
                    case 'partial1':
                    case 'zone1': 
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM);
                        break;
                    case 'total': 
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM);
                        break;
                    case 'partial2':
                    case 'zone2': 
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM);
                        break;
                }
                break;
        }
    }
}