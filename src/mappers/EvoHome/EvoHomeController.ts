import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class EvoHomeController extends HeatingSystem {
    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ validValues: [
            Characteristics.TargetHeatingCoolingState.AUTO,
            Characteristics.TargetHeatingCoolingState.OFF,
        ] });
    }

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return new Command('setOperatingMode', 'auto');
            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setOperatingMode', 'off');
        }
    }
}