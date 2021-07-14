import { Characteristics } from '../../Platform';
import { Command, State } from 'overkiz-client';
import WaterHeatingSystem from '../WaterHeatingSystem';

export default class AtlanticPassAPCDHW extends WaterHeatingSystem {
    protected THERMOSTAT_CHARACTERISTICS = ['eco', 'prog'];

    protected registerServices() {
        this.registerThermostatService();
        if (this.device.hasCommand('setBoostOnOffState')) {
            this.registerSwitchService('boost');
        }
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        const commands: Array<Command> = [];
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setDHWOnOffState', 'on'));
                if (this.prog?.value) {
                    commands.push(new Command('setPassAPCDHWMode', 'internalScheduling'));
                } else {
                    if (this.eco?.value) {
                        commands.push(new Command('setPassAPCDHWMode', 'eco'));
                    } else {
                        commands.push(new Command('setPassAPCDHWMode', 'comfort'));
                    }
                }
                break;

            case Characteristics.TargetHeatingCoolingState.OFF:
                commands.push(new Command('setDHWOnOffState', 'off'));
                break;
        }
        return commands;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        if (this.targetState?.value === Characteristics.TargetHeatingCoolingState.COOL) {
            return new Command('setEcoTargetDHWTemperature', value);
        } else {
            return new Command('setComfortTargetDHWTemperature', value);
        }
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command('setBoostOnOffState', value ? 'on' : 'off');
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
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
        if (this.device.get('core:DHWOnOffState') === 'on') {
            targetState = Characteristics.TargetHeatingCoolingState.AUTO;
            switch (this.device.get('io:PassAPCDHWModeState')) {
                case 'off':
                case 'stop':
                    targetState = Characteristics.TargetHeatingCoolingState.OFF;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                    this.targetTemperature?.updateValue(this.device.get('core:TargetDHWTemperatureState'));
                    break;
                case 'internalScheduling':
                case 'externalScheduling':
                    this.prog?.updateValue(true);
                    if (this.device.get('io:PassAPCDHWProfileState') === 'comfort') {
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                        this.targetTemperature?.updateValue(this.device.get('core:ComfortTargetDHWTemperatureState'));
                    } else {
                        this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                        this.targetTemperature?.updateValue(this.device.get('core:EcoTargetDHWTemperatureState'));
                    }
                    break;
                case 'comfort':
                    this.prog?.updateValue(false);
                    this.eco?.updateValue(false);
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    this.targetTemperature?.updateValue(this.device.get('core:ComfortTargetDHWTemperatureState'));
                    break;
                case 'eco':
                    this.prog?.updateValue(false);
                    this.eco?.updateValue(true);
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                    this.targetTemperature?.updateValue(this.device.get('core:EcoTargetDHWTemperatureState'));
                    break;
            }
        } else {
            targetState = Characteristics.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
            this.targetTemperature?.updateValue(this.device.get('core:TargetDHWTemperatureState'));
        }
        if (this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}