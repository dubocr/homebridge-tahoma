import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import { Characteristics } from '../../../Platform';
import DomesticHotWaterProduction from '../DomesticHotWaterProduction';

export default class AtlanticDomesticHotWaterProductionV2_SPLIT_IOComponent extends DomesticHotWaterProduction {
    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        const commands = Array<Command>();
        if(this.targetState?.value === Characteristics.TargetHeatingCoolingState.OFF) {
            commands.push(new Command('setCurrentOperatingMode', { 'relaunch': 'off', 'absence': 'off' }));
        }
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setDHWMode', 'autoMode'));
                break;
            case Characteristics.TargetHeatingCoolingState.HEAT:
                commands.push(new Command('setDHWMode', 'manualEcoInactive'));
                break;
            case Characteristics.TargetHeatingCoolingState.COOL:
                commands.push(new Command('setDHWMode', 'manualEcoActive'));
                break;
            case Characteristics.TargetHeatingCoolingState.OFF:
                commands.push(new Command('setCurrentOperatingMode', { 'relaunch': 'off', 'absence': 'on' }));
                break;
        }
        return commands;
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command('setCurrentOperatingMode', { 'relaunch': value ? 'on' : 'off', 'absence': 'off' });
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'io:MiddleWaterTemperatureState':
                this.currentTemperature?.updateValue(value);
                break;
            case 'core:TargetTemperatureState':
                this.targetTemperature?.updateValue(value);
                break;
            case 'io:DHWModeState':
            case 'core:OperatingModeState':
                this.postpone(this.computeStates);
                break;
        }
    }

    protected computeStates() {
        let targetState;
        const operatingMode = this.device.get('core:OperatingModeState');
        this.on?.updateValue(operatingMode.relaunch !== 'off');
        if(operatingMode.absence === 'off') {
            switch(this.device.get('io:DHWModeState')) {
                case 'autoMode':
                    targetState = Characteristics.TargetHeatingCoolingState.AUTO;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    break;
                case 'manualEcoInactive':
                    targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                    break;
                case 'manualEcoActive':
                    targetState = Characteristics.TargetHeatingCoolingState.COOL;
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                    break;
            }
        } else {
            targetState = Characteristics.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
        }
        if(this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}