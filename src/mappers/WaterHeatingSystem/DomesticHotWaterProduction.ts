import { Characteristics } from '../../Platform';
import { Characteristic, Perms } from 'homebridge';
import { Command } from 'overkiz-client';
import WaterHeatingSystem from '../WaterHeatingSystem';

export default class DomesticHotWaterProduction extends WaterHeatingSystem {
    protected registerServices() {
        this.registerThermostatService();
        this.registerSwitchService('boost');
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
                if(!this.device.hasState('core:MiddleWaterTemperatureInState')) {
                    this.currentTemperature?.updateValue(value);
                }
                break;
            case 'core:MiddleWaterTemperatureInState':
                this.currentTemperature?.updateValue(value);
                break;
            case 'core:WaterTargetTemperatureState':
                this.targetTemperature?.updateValue(value);
                break;
        }
    }
}