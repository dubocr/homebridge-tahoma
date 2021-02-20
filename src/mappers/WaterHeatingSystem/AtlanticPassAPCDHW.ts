import { Command } from 'overkiz-client';
import WaterHeatingSystem from '../WaterHeatingSystem';

export default class AtlanticPassAPCDHW extends WaterHeatingSystem {  

    protected getTargetStateCommands(value): Command | Array<Command> {
        const commands: Array<Command> = [];
        switch(value) {
            case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setDHWOnOffState', 'on'));
                commands.push(new Command('setPassAPCDHWMode', 'internalScheduling'));
                break;

            case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
                commands.push(new Command('setBoostOnOffState', 'off'));
                commands.push(new Command('setDHWOnOffState', 'on'));
                commands.push(new Command('setPassAPCDHWMode', 'comfort'));
                break;

            case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
                commands.push(new Command('setBoostOnOffState', 'off'));
                commands.push(new Command('setDHWOnOffState', 'on'));
                commands.push(new Command('setPassAPCDHWMode', 'eco'));
                break;

            case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
                commands.push(new Command('setDHWOnOffState', 'off'));
                break;
        }
        return commands;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        const commands: Array<Command> = [];
        if(this.targetState?.value === this.platform.Characteristic.TargetHeatingCoolingState.AUTO) {
            commands.push(new Command('setBoostOnOffState', 'on'));
        } else {
            if(this.targetState?.value === this.platform.Characteristic.TargetHeatingCoolingState.HEAT) {
                commands.push(new Command('setComfortTargetDHWTemperature', value));
            } else if(this.targetState?.value === this.platform.Characteristic.TargetHeatingCoolingState.COOL) {
                commands.push(new Command('setEcoTargetDHWTemperature', value));
            }
        }
        return commands;
    }

    protected onStateChange(name: string, value) {
        this.debug(name + ' => ' + value);
        switch(name) {
            case 'core:TargetDHWTemperatureState': this.onTemperatureUpdate(value); break;
        }
    }

    protected onStatesUpdate() {
        let targetState;
        this.debug('States updated => ' + this.device.get('io:PassAPCDHWModeState'));
        if(this.device.get('core:DHWOnOffState') === 'on') {
            switch(this.device.get('io:PassAPCDHWModeState')) {
                case 'off':
                case 'stop':
                    targetState = this.platform.Characteristic.TargetHeatingCoolingState.OFF;
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
                    this.targetTemperature?.updateValue(this.device.get('core:TargetDHWTemperatureState'));
                    break;
                case 'internalScheduling':
                case 'externalScheduling':
                    targetState = this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
                    this.targetTemperature?.updateValue(this.device.get('core:TargetDHWTemperatureState'));
                    if(this.device.get('io:PassAPCDHWProfileState') === 'comfort') {
                        this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                    } else {
                        this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
                    }
                    break;
                case 'comfort':
                    targetState = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                    this.targetTemperature?.updateValue(this.device.get('core:ComfortTargetDHWTemperatureState'));
                    break;
                case 'eco':
                    targetState = this.platform.Characteristic.TargetHeatingCoolingState.COOL;
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
                    this.targetTemperature?.updateValue(this.device.get('core:EcoTargetDHWTemperatureState'));
                    break;
            }
        } else {
            targetState = this.platform.Characteristic.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
            this.targetTemperature?.updateValue(this.device.get('core:TargetDHWTemperatureState'));
        }
        if(this.targetState && targetState && !this.device.isCommandInProgress()) {
            this.targetState.value = targetState;
        }
    }
}