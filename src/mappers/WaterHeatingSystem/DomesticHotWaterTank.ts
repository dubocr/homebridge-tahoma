import { Service } from 'homebridge';
import { Command } from 'overkiz-client';
import WaterHeatingSystem from '../WaterHeatingSystem';

export default class DomesticHotWaterTank extends WaterHeatingSystem {
    protected registerMainService(): Service {
        return this.registerSwitchService('boost');
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command('setForceHeating', value ? 'on' : 'off');
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'io:ForceHeatingState':
                this.on?.updateValue(value === 'on');
                break;
        }
    }
}