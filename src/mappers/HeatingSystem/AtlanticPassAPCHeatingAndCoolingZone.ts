import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCHeatingAndCoolingZone extends HeatingSystem { 
    protected registerServices() {
        this.registerThermostatService();
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        const heatingCooling = this.getHeatingCooling();
        const commands: Array<Command> = [];
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('set' + heatingCooling + 'OnOffState', 'on'));
                commands.push(new Command('setPassAPC' + heatingCooling + 'Mode', 'internalScheduling'));
                break;

            case Characteristics.TargetHeatingCoolingState.HEAT:
                commands.push(new Command('setDerogationOnOffState', 'off'));
                commands.push(new Command('set' + heatingCooling + 'OnOffState', 'on'));
                commands.push(new Command('setPassAPC' + heatingCooling + 'Mode', 'comfort'));
                break;

            case Characteristics.TargetHeatingCoolingState.COOL:
                commands.push(new Command('setDerogationOnOffState', 'off'));
                commands.push(new Command('set' + heatingCooling + 'OnOffState', 'on'));
                commands.push(new Command('setPassAPC' + heatingCooling + 'Mode', 'eco'));
                break;

            case Characteristics.TargetHeatingCoolingState.OFF:
                commands.push(new Command('set' + heatingCooling + 'OnOffState', 'off'));
                //commands.push(new Command('setHeatingOnOffState', 'on'));
                //commands.push(new Command('setPassAPCHeatingMode', 'absence'));
                break;
        }
        return commands;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        const heatingCooling = this.getHeatingCooling();
        const commands: Array<Command> = [];
        if(this.device.get('io:PassAPC' + heatingCooling + 'ModeState') === 'internalScheduling') {

            commands.push(new Command('setDerogatedTargetTemperature', value));
            commands.push(new Command('setDerogationTime', this.derogationDuration));
            commands.push(new Command('setDerogationOnOffState', 'on'));

        } else {
            if(this.device.get('io:PassAPC' + heatingCooling + 'ModeState') === 'comfort') {
                commands.push(new Command('setComfort' + heatingCooling + 'TargetTemperature', value));
            } else if(this.device.get('io:PassAPC' + heatingCooling + 'ModeState') === 'eco') {
                commands.push(new Command('setEco' + heatingCooling + 'TargetTemperature', value));
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

    private getHeatingCooling() {
        if(
            this.device.get('io:PassAPCHeatingProfileState') === 'stop' &&
            this.device.get('io:PassAPCCoolingProfileState') !== 'stop'
        ) {
            return 'Cooling';
        } else {
            return 'Heating';
        }
    }

    protected computeStates() {
        let targetState;
        const heatingCooling = this.getHeatingCooling();

        if(this.device.get('io:PassAPC' + heatingCooling + 'ModeState') === 'internalScheduling') {
            targetState = Characteristics.TargetHeatingCoolingState.AUTO;
            if(this.device.get('io:PassAPC' + heatingCooling + 'ProfileState') === 'derogation') {
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                this.targetTemperature?.updateValue(this.device.get('core:DerogatedTargetTemperatureState'));
            } else if(this.device.get('io:PassAPC' + heatingCooling + 'ProfileState') === 'comfort') {
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                this.targetTemperature?.updateValue(this.device.get('core:Comfort' + heatingCooling + 'TargetTemperatureState'));
            } else if(this.device.get('io:PassAPC' + heatingCooling + 'ProfileState') === 'eco') {
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                this.targetTemperature?.updateValue(this.device.get('core:Eco' + heatingCooling + 'TargetTemperatureState'));
            } else {
                this.targetTemperature?.updateValue(this.device.get('core:TargetTemperatureState'));
            }
        } else if(this.device.get('io:PassAPC' + heatingCooling + 'ModeState') === 'comfort') {
            targetState = Characteristics.TargetHeatingCoolingState.HEAT;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
            this.targetTemperature?.updateValue(this.device.get('core:Comfort' + heatingCooling + 'TargetTemperatureState'));
        } else if(this.device.get('io:PassAPC' + heatingCooling + 'ModeState') === 'eco') {
            targetState = Characteristics.TargetHeatingCoolingState.COOL;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
            this.targetTemperature?.updateValue(this.device.get('core:Eco' + heatingCooling + 'TargetTemperatureState'));
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