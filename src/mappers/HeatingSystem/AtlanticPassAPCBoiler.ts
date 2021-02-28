import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCBoiler extends HeatingSystem {  
    protected registerServices() {
        this.registerSwitchService();
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command('setPassAPCOperatingMode', value ? 'heating' : 'stop');
    }

    protected onStateChanged(name, value) {
        switch(name) {
            case 'io:PassAPCOperatingModeState':
                switch(value) {
                    case 'stop':
                        this.on?.updateValue(0);
                        break;
                    case 'heating':
                    case 'drying':
                    case 'cooling':
                        this.on?.updateValue(1);
                        break;
                }
        }
    }
}