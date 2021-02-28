import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class EvoHomeController extends HeatingSystem {
    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ validValues: [
            this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
            this.platform.Characteristic.TargetHeatingCoolingState.OFF,
        ] });
    }

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        switch(value) {
            case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
                return new Command('setOperatingMode', 'auto');
            case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
                return new Command('setOperatingMode', 'off');
        }
    }
}