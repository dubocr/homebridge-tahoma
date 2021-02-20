import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';
import AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint from './AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint';

export default class AtlanticElectricalTowelDryer extends HeatingSystem {   
    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ validValues: [
            this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
            this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
            this.platform.Characteristic.TargetHeatingCoolingState.OFF,
        ] });
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        const commands = new Array<Command>();
        switch(value) {
            case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setTowelDryerOperatingMode', 'internal'));
                break;
            case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
                commands.push(new Command('setTowelDryerOperatingMode', 'external'));
                break;
            case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
                commands.push(new Command('setTowelDryerOperatingMode', 'standby'));
                break;
        }
        return commands;
    }

    protected onStateChange(name: string, value) {
        this.debug(name + ' => ' + value);
        switch(name) {
            case 'core:ComfortRoomTemperatureState': this.onTemperatureUpdate(value); break;
            case 'io:EffectiveTemperatureSetpointState': this.targetTemperature?.updateValue(value); break;
        }
    }

    protected onStatesUpdate() {
        this.debug('States updated => ' + this.device.get('core:OperatingModeState'));
        switch(this.device.get('core:OperatingModeState')) {
            case 'standby':
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.OFF);
                this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
                break;
            case 'auto':
            case 'internal':
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.AUTO);
                if(this.device.get('io:TargetHeatingLevelState') === 'eco') {
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
                } else {
                    this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                }
                break;
            case 'external':
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
                this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                break;
        }
    }
}