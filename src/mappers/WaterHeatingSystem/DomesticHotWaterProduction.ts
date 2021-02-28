import { Characteristic, Perms } from 'homebridge';
import { Command } from 'overkiz-client';
import WaterHeatingSystem from '../WaterHeatingSystem';

export default class DomesticHotWaterProduction extends WaterHeatingSystem {
    protected registerServices() {
        this.registerThermostatService();
        this.registerSwitchService('Boost');
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        return new Command('setWaterTargetTemperature', value);
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command('setBoostMode', value ? 'on' : 'off');
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'io:DHWBoostModeState':
                this.on?.updateValue(value === 'on');
                break;
            case 'core:WaterTemperatureState':
                this.currentState?.updateValue(value);
                break;
            case 'core:WaterTargetTemperatureState':
                this.targetState?.updateValue(value);
                break;
        }
    }
}