import { Command } from 'overkiz-client';
import HeatingSystem from './HeatingSystem';

export default class ExteriorHeatingSystem extends HeatingSystem {
    protected registerMainService() {
        return this.registerSwitchService();
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command(value ? 'on' : 'off');
    }
}