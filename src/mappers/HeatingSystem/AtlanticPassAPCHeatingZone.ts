import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCHeatingZone extends HeatingSystem {  
    protected registerServices() {
        this.registerThermostatService();
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        const commands: Array<Command> = [];
        switch(value) {
            case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setHeatingOnOffState', 'on'));
                commands.push(new Command('setPassAPCHeatingMode', 'internalScheduling'));
                break;

            case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
                commands.push(new Command('setDerogationOnOffState', 'off'));
                commands.push(new Command('setHeatingOnOffState', 'on'));
                commands.push(new Command('setPassAPCHeatingMode', 'comfort'));
                break;

            case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
                commands.push(new Command('setDerogationOnOffState', 'off'));
                commands.push(new Command('setHeatingOnOffState', 'on'));
                commands.push(new Command('setPassAPCHeatingMode', 'eco'));
                break;

            case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
                commands.push(new Command('setHeatingOnOffState', 'off'));
                //commands.push(new Command('setHeatingOnOffState', 'on'));
                //commands.push(new Command('setPassAPCHeatingMode', 'absence'));
                break;
        }
        return commands;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        const duration = this.config['derogationDuration'];
        const commands: Array<Command> = [];
        if(this.targetState?.value === this.platform.Characteristic.TargetHeatingCoolingState.AUTO) {
            commands.push(new Command('setDerogatedTargetTemperature', value));
            commands.push(new Command('setDerogationTime', duration));
            commands.push(new Command('setDerogationOnOffState', 'on'));
        } else {
            if(this.targetState?.value === this.platform.Characteristic.TargetHeatingCoolingState.HEAT) {
                commands.push(new Command('setComfortHeatingTargetTemperature', value));
            } else if(this.targetState?.value === this.platform.Characteristic.TargetHeatingCoolingState.COOL) {
                commands.push(new Command('setEcoHeatingTargetTemperature', value));
            }
        }
        return commands;
    }

    protected onStateChanged(name, value) {
        switch(name) {
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
        if(this.device.get('core:HeatingOnOffState') === 'on') {
            switch(this.device.get('io:PassAPCHeatingModeState')) {
                case 'off':
                case 'absence':
                    targetState = this.platform.Characteristic.TargetHeatingCoolingState.OFF;
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
                    this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
                    break;
                case 'auto':
                case 'internalScheduling':
                case 'externalScheduling':
                    targetState = this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
                    this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
                    if(this.device.get('io:PassAPCHeatingProfileState') === 'comfort') {
                        this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                    } else {
                        this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
                    }
                    break;
                case 'comfort':
                    targetState = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                    this.targetTemperature?.updateValue(this.device.get('core:ComfortHeatingTargetTemperatureState'));
                    break;
                case 'eco':
                    targetState = this.platform.Characteristic.TargetHeatingCoolingState.COOL;
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
                    this.targetTemperature?.updateValue(this.device.get('core:EcoHeatingTargetTemperatureState'));
                    break;
            }
        } else {
            targetState = this.platform.Characteristic.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
            this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
        }
        if(this.targetState !== undefined && targetState !== undefined && !this.device.isCommandInProgress()) {
            this.targetState.value = targetState;
        }
    }
}