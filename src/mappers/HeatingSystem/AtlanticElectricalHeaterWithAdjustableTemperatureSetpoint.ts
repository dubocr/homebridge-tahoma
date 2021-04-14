import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint extends HeatingSystem {   
    
    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ 
            validValues: [
                Characteristics.TargetHeatingCoolingState.AUTO,
                Characteristics.TargetHeatingCoolingState.HEAT,
                Characteristics.TargetHeatingCoolingState.OFF,
            ],
        });
        this.targetTemperature?.setProps({
            minValue: 16,
            maxValue: 28,
            minStep: 0.5,
        });
        if(this.targetTemperature && this.targetTemperature.value! < 16) {
            this.targetTemperature.value = 16;
        }
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                if(this.device.get('io:NativeFunctionalLevelState') === 'Top') {
                    return new Command('setOperatingMode', 'auto');
                } else {
                    return new Command('setOperatingMode', 'internal');
                }
            case Characteristics.TargetHeatingCoolingState.HEAT:
                return new Command('setOperatingMode', 'basic');
            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setOperatingMode', 'standby');
        }
        return [];
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> | undefined {
        if(this.device.get('core:OperatingModeState') === 'internal') {
            return new Command('setDerogatedTargetTemperature', value);
        } else {
            return new Command('setTargetTemperature', value);
        }
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:TemperatureState': 
                this.onTemperatureUpdate(value);
                break;
            case 'io:EffectiveTemperatureSetpointState':
            //case 'core:TargetTemperatureState': 
                this.targetTemperature?.updateValue(value);
                break;
            case 'io:TargetHeatingLevelState':
            case 'core:OperatingModeState':
                this.postpone(this.computeStates);
                break;
        }
    }

    protected computeStates() {
        let targetState;
        switch(this.device.get('core:OperatingModeState')) {
            case 'off':
            case 'away':
            case 'frostprotection':
                targetState = Characteristics.TargetHeatingCoolingState.OFF;
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                break;
            case 'auto':
            case 'prog':
            case 'program':
            case 'internal':
                targetState = Characteristics.TargetHeatingCoolingState.AUTO;
                if(this.device.get('io:TargetHeatingLevelState') === 'eco') {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                } else {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                }
                break;
            case 'comfort':
            case 'eco':
            case 'manual':
            case 'basic':
                targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                break;
        }

        if(this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}