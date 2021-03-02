import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCHeatingAndCoolingZone extends HeatingSystem { 
    protected registerServices() {
        this.registerThermostatService();
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        const commands: Array<Command> = [];
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setHeatingOnOffState', 'on'));
                commands.push(new Command('setCoolingOnOffState', 'on'));
                break;

            case Characteristics.TargetHeatingCoolingState.HEAT:
                commands.push(new Command('setHeatingOnOffState', 'on'));
                commands.push(new Command('setCoolingOnOffState', 'off'));
                break;

            case Characteristics.TargetHeatingCoolingState.COOL:
                commands.push(new Command('setHeatingOnOffState', 'off'));
                commands.push(new Command('setCoolingOnOffState', 'on'));
                break;

            case Characteristics.TargetHeatingCoolingState.OFF:
                commands.push(new Command('setHeatingOnOffState', 'off'));
                commands.push(new Command('setCoolingOnOffState', 'off'));
                break;
        }
        return commands;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        const commands: Array<Command> = [];
        if(
            this.device.get('io:PassAPCHeatingModeState') === 'internalScheduling' ||
            this.device.get('io:PassAPCCoolingModeState') === 'internalScheduling'
        ) {

            commands.push(new Command('setDerogatedTargetTemperature', value));
            commands.push(new Command('setDerogationTime', this.derogationDuration));
            commands.push(new Command('setDerogationOnOffState', 'on'));

        } else {
            if(this.device.get('io:PassAPCHeatingModeState') === 'comfort') {
                commands.push(new Command('setComfortHeatingTargetTemperature', value));
            } else if(this.device.get('io:PassAPCHeatingModeState') === 'eco') {
                commands.push(new Command('setEcoHeatingTargetTemperature', value));
            } else if(this.device.get('io:PassAPCCoolingModeState') === 'comfort') {
                commands.push(new Command('setComfortCoolingTargetTemperature', value));
            } else if(this.device.get('io:PassAPCCoolingModeState') === 'eco') {
                commands.push(new Command('setEcoCoolingTargetTemperature', value));
            }
        }
        return commands;
    }

    protected onStateChanged(name, value) {
        switch(name) {
            case 'core:TemperatureState': this.onTemperatureUpdate(value); break;
            case 'core:TargetTemperatureState':
            case 'core:HeatingOnOffState':
            case 'core:CoolingOnOffState':
            case 'io:PassAPCHeatingModeState':
            case 'io:PassAPCCoolingModeState':
            case 'core:ComfortHeatingTargetTemperatureState':
            case 'core:EcoHeatingTargetTemperatureState':
            case 'core:ComfortCoolingTargetTemperatureState':
            case 'core:EcoCoolingTargetTemperatureState':
                this.postpone(this.computeStates);
        }
    }

    protected computeStates() {
        let targetState;
        if(
            this.device.get('core:HeatingOnOffState') === 'on' &&
            this.device.get('core:CoolingOnOffState') === 'on'
        ) {
            targetState = Characteristics.TargetHeatingCoolingState.AUTO;
            this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
            if(this.device.get('io:PassAPCCoolingModeState') === 'stop') {
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
            } else {
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
            }
        } else if(this.device.get('core:HeatingOnOffState') === 'on') {
            targetState = Characteristics.TargetHeatingCoolingState.HEAT;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
            if(this.device.get('io:PassAPCHeatingProfileState') === 'comfort') {
                this.targetTemperature?.updateValue(this.device.get('core:ComfortHeatingTargetTemperatureState'));
            } else {
                this.targetTemperature?.updateValue(this.device.get('core:EcoHeatingTargetTemperatureState'));
            }
        } else if(this.device.get('core:CoolingOnOffState') === 'on') {
            targetState = Characteristics.TargetHeatingCoolingState.COOL;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
            if(this.device.get('io:PassAPCHeatingProfileState') === 'comfort') {
                this.targetTemperature?.updateValue(this.device.get('core:ComfortCoolingTargetTemperatureState'));
            } else {
                this.targetTemperature?.updateValue(this.device.get('core:EcoCoolingTargetTemperatureState'));
            }
        } else {
            targetState = Characteristics.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
            this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
        }
        if(this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.value = targetState;
        }
    }
}