import { Characteristic, Service } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import HeatingSystem from './HeatingSystem';

export default class ExteriorHeatingSystem extends HeatingSystem {
    protected registerServices() {
        this.registerSwitchService();
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command(value ? 'on' : 'off');
    }
}