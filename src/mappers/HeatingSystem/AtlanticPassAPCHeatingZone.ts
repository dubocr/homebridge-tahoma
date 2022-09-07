import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCHeatingZone extends HeatingSystem {
    protected THERMOSTAT_CHARACTERISTICS = ['eco', 'prog'];
    protected MIN_TEMP = 10;
    protected MAX_TEMP = 35;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected getTargetStateCommands(value): Command | Array<Command> {
        const commands: Array<Command> = [];
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setHeatingOnOffState', 'on'));
                if (this.prog?.value) {
                    commands.push(new Command('setPassAPCHeatingMode', 'internalScheduling'));
                } else {
                    commands.push(new Command('setDerogationOnOffState', 'off'));
                    if (this.eco?.value) {
                        commands.push(new Command('setPassAPCHeatingMode', 'eco'));
                    } else {
                        commands.push(new Command('setPassAPCHeatingMode', 'comfort'));
                    }
                }
                break;

            case Characteristics.TargetHeatingCoolingState.OFF:
                commands.push(new Command('setHeatingOnOffState', 'off'));
                //commands.push(new Command('setHeatingOnOffState', 'on'));
                //commands.push(new Command('setPassAPCHeatingMode', 'absence'));
                break;
        }
        return commands;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        const duration = this.derogationDuration;
        const commands: Array<Command> = [];
        if (this.prog?.value) {
            commands.push(new Command('setDerogatedTargetTemperature', value));
            commands.push(new Command('setDerogationTime', duration));
            commands.push(new Command('setDerogationOnOffState', 'on'));
        } else {
            if (this.eco?.value) {
                commands.push(new Command('setEcoHeatingTargetTemperature', value));
            } else {
                commands.push(new Command('setComfortHeatingTargetTemperature', value));
            }
        }
        return commands;
    }

    protected onStateChanged(name, value) {
        switch (name) {
            case 'core:TemperatureState': this.onTemperatureUpdate(value); break;
            case 'core:TargetTemperatureState':
            case 'core:HeatingOnOffState':
            case 'io:PassAPCHeatingModeState':
            case 'io:PassAPCHeatingProfileState':
            case 'core:ComfortHeatingTargetTemperatureState':
            case 'core:EcoHeatingTargetTemperatureState':
                this.postpone(this.computeStates);
        }
    }

    protected computeStates() {
        let targetState;
        if (this.device.get('core:HeatingOnOffState') === 'on') {
            targetState = Characteristics.TargetHeatingCoolingState.AUTO;
            switch (this.device.get('io:PassAPCHeatingModeState')) {
                case 'off':
                case 'absence':
                    targetState = Characteristics.TargetHeatingCoolingState.OFF;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                    this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
                    break;
                case 'auto':
                case 'internalScheduling':
                case 'externalScheduling':
                    this.prog?.updateValue(true);
                    if (this.device.get('io:PassAPCHeatingProfileState') === 'comfort') {
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    } else {
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                    }
                    if (this.device.get('io:PassAPCHeatingProfileState') === 'derogation') {
                        this.targetTemperature?.updateValue(this.device.get('core:DerogatedTargetTemperatureState'));
                    } else if (this.device.get('io:PassAPCHeatingProfileState') === 'comfort') {
                        this.targetTemperature?.updateValue(this.device.get('core:ComfortHeatingTargetTemperatureState'));
                    } else if (this.device.get('io:PassAPCHeatingProfileState') === 'eco') {
                        this.targetTemperature?.updateValue(this.device.get('core:EcoHeatingTargetTemperatureState'));
                    } else {
                        this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
                    }
                    break;
                case 'comfort':
                    this.prog?.updateValue(false);
                    this.eco?.updateValue(false);
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    this.targetTemperature?.updateValue(this.device.get('core:ComfortHeatingTargetTemperatureState'));
                    break;
                case 'eco':
                    this.prog?.updateValue(false);
                    this.eco?.updateValue(true);
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                    this.targetTemperature?.updateValue(this.device.get('core:EcoHeatingTargetTemperatureState'));
                    break;
            }
        } else {
            targetState = Characteristics.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
            this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
        }
        if (this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}