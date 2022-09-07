import { Perms } from 'homebridge';
import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCHeatPump extends HeatingSystem {
    protected MIN_TEMP = 0;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.HEAT,
        Characteristics.TargetHeatingCoolingState.COOL,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected registerMainService() {
        const service = super.registerMainService();
        this.targetTemperature?.setProps({ perms: [Perms.PAIRED_READ, Perms.EVENTS] });
        return service;
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return new Command('setPassAPCOperatingMode', 'heating');

            case Characteristics.TargetHeatingCoolingState.HEAT:
                return new Command('setPassAPCOperatingMode', 'heating');

            case Characteristics.TargetHeatingCoolingState.COOL:
                return new Command('setPassAPCOperatingMode', 'cooling');

            default:
            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setPassAPCOperatingMode', 'stop');
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        return [];
    }

    protected onStateChanged(name, value) {
        switch (name) {
            case 'io:PassAPCOperatingModeState':
                this.postpone(this.computeStates);
        }
    }

    protected computeStates() {
        let targetState;
        switch (this.device.get('io:PassAPCOperatingModeState')) {
            case 'heating':
                targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                break;
            case 'cooling':
                targetState = Characteristics.TargetHeatingCoolingState.COOL;
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                break;
            case 'stop':
                targetState = Characteristics.TargetHeatingCoolingState.OFF;
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                break;
        }

        // eslint-disable-next-line eqeqeq
        if (this.targetState !== undefined && targetState != null && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}