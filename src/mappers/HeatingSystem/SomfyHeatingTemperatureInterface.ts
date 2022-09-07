import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class SomfyHeatingTemperatureInterface extends HeatingSystem {
    protected THERMOSTAT_CHARACTERISTICS = ['prog', 'eco'];
    protected MIN_TEMP = 0;
    protected MAX_TEMP = 26;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.HEAT,
        Characteristics.TargetHeatingCoolingState.COOL,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return [
                    new Command('setOnOff', 'on'),
                    new Command('setOperatingMode', 'both'),
                ];

            case Characteristics.TargetHeatingCoolingState.HEAT:
                return [
                    new Command('setOnOff', 'on'),
                    new Command('setOperatingMode', 'heating'),
                ];

            case Characteristics.TargetHeatingCoolingState.COOL:
                return [
                    new Command('setOnOff', 'on'),
                    new Command('setOperatingMode', 'cooling'),
                ];

            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setOnOff', 'off');
        }
    }

    protected getProgCommands(): Command | Array<Command> | undefined {
        if (this.prog?.value) {
            return new Command('setActiveMode', 'auto');
        } else {
            if (this.eco?.value) {
                return new Command('setManuAndSetPointModes', 'eco');
            } else {
                return new Command('setManuAndSetPointModes', 'comfort');
            }
        }
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> | undefined {
        if (this.device.get('ovp:HeatingTemperatureInterfaceSetPointModeState') === 'comfort') {
            return new Command('setComfortTemperature', value);
        } else {
            return new Command('setEcoTemperature', value);
        }
    }

    protected onStateChanged(name, value) {
        super.onStateChanged(name, value);
        switch (name) {
            case 'core:OnOffState':
            case 'ovp:HeatingTemperatureInterfaceOperatingModeState':
                this.postpone(this.computeStates);
                break;
        }
    }

    protected computeStates() {
        let targetState;
        if (this.device.get('core:OnOffState') === 'on') {
            switch (this.device.get('ovp:HeatingTemperatureInterfaceOperatingModeState')) {
                case 'both':
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    targetState = Characteristics.TargetHeatingCoolingState.AUTO;
                    break;
                case 'heating':
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                    break;
                case 'cooling':
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                    targetState = Characteristics.TargetHeatingCoolingState.COOL;
                    break;
            }
        } else {
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
            targetState = Characteristics.TargetHeatingCoolingState.OFF;
        }
        if (this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}