import { Characteristics } from '../../Platform';
import { Command, State } from 'overkiz-client';
import WaterHeatingSystem from '../WaterHeatingSystem';

export default class AtlanticPassAPCDHW extends WaterHeatingSystem {  
    protected registerServices() {
        this.registerThermostatService();
        if(this.device.hasCommand('setBoostOnOffState')) {
            this.registerSwitchService('boost');
        }
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        const commands: Array<Command> = [];
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setDHWOnOffState', 'on'));
                commands.push(new Command('setPassAPCDHWMode', 'internalScheduling'));
                break;

            case Characteristics.TargetHeatingCoolingState.HEAT:
                commands.push(new Command('setDHWOnOffState', 'on'));
                commands.push(new Command('setPassAPCDHWMode', 'comfort'));
                break;

            case Characteristics.TargetHeatingCoolingState.COOL:
                commands.push(new Command('setDHWOnOffState', 'on'));
                commands.push(new Command('setPassAPCDHWMode', 'eco'));
                break;

            case Characteristics.TargetHeatingCoolingState.OFF:
                commands.push(new Command('setDHWOnOffState', 'off'));
                break;
        }
        return commands;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        if(this.targetState?.value === Characteristics.TargetHeatingCoolingState.COOL) {
            return new Command('setEcoTargetDHWTemperature', value);
        } else {
            return new Command('setComfortTargetDHWTemperature', value);
        }
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command('setBoostOnOffState', value ? 'on' : 'off');
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:TargetDHWTemperatureState':
                this.onTemperatureUpdate(value);
                //this.postpone(this.computeStates);
                break;
            case 'core:DHWOnOffState':
            case 'io:PassAPCDHWModeState':
            case 'io:PassAPCDHWProfileState':
            case 'core:ComfortTargetDHWTemperatureState':
            case 'core:EcoTargetDHWTemperatureState':
                this.postpone(this.computeStates);
                break;
            case 'core:BoostOnOffState':
                this.on?.updateValue(value === 'on');
                break;
        }
    }

    protected computeStates() {
        let targetState;
        if(this.device.get('core:DHWOnOffState') === 'on') {
            switch(this.device.get('io:PassAPCDHWModeState')) {
                case 'off':
                case 'stop':
                    targetState = Characteristics.TargetHeatingCoolingState.OFF;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                    this.targetTemperature?.updateValue(this.device.get('core:TargetDHWTemperatureState'));
                    break;
                case 'internalScheduling':
                case 'externalScheduling':
                    targetState = Characteristics.TargetHeatingCoolingState.AUTO;
                    if(this.device.get('io:PassAPCDHWProfileState') === 'comfort') {
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                        this.targetTemperature?.updateValue(this.device.get('core:ComfortTargetDHWTemperatureState'));
                    } else {
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                        this.targetTemperature?.updateValue(this.device.get('core:EcoTargetDHWTemperatureState'));
                    }
                    break;
                case 'comfort':
                    targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    this.targetTemperature?.updateValue(this.device.get('core:ComfortTargetDHWTemperatureState'));
                    break;
                case 'eco':
                    targetState = Characteristics.TargetHeatingCoolingState.COOL;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                    this.targetTemperature?.updateValue(this.device.get('core:EcoTargetDHWTemperatureState'));
                    break;
            }
        } else {
            targetState = Characteristics.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
            this.targetTemperature?.updateValue(this.device.get('core:TargetDHWTemperatureState'));
        }
        if(this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.value = targetState;
        }
    }
}