import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalTowelDryer extends HeatingSystem {   
    protected drying: Characteristic | undefined;

    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ validValues: [
            this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
            this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
            this.platform.Characteristic.TargetHeatingCoolingState.OFF,
        ] });
        if(this.device.hasCommand('setTowelDryerBoostModeDuration')) {
            this.registerSwitchService('boost');
        }
        if(this.device.hasCommand('setDryingDuration')) {
            const service = this.registerService(this.platform.Service.Switch, 'drying');
            this.drying = service.getCharacteristic(this.platform.Characteristic.On);
            
            this.drying?.on('set', this.setDrying.bind(this));
        }
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

    protected getOnCommands(value): Command | Array<Command> {
        const commands = new Array<Command>();
        commands.push(new Command('setTowelDryerTemporaryState', value ? 'boost' : 'permanentHeating'));
        if(value) {
            commands.push(new Command('setTowelDryerBoostModeDuration', 10));
        }
        return commands;
    }

    protected async setDrying(value, callback) {
        const commands = new Array<Command>();
        commands.push(new Command('setTowelDryerTemporaryState', value ? 'drying' : 'permanentHeating'));
        if(value) {
            commands.push(new Command('setDryingDuration', 60));
        }
        const action = await this.executeCommands(commands, callback);
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.FAILED:
                    this.drying?.updateValue(!value);
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value) {
        this.debug(name + ' => ' + value);
        switch(name) {
            case 'core:ComfortRoomTemperatureState': this.onTemperatureUpdate(value); break;
            case 'io:EffectiveTemperatureSetpointState': this.targetTemperature?.updateValue(value); break;
            case 'io:TowelDryerTemporaryStateState':
                this.on?.updateValue(value === 'boost');
                this.drying?.updateValue(value === 'drying');
                break;
            case 'core:OperatingModeState':
            case 'io:TargetHeatingLevelState':
                this.postpone(this.computeStates);
                break;
        }
    }

    protected computeStates() {
        switch(this.device.get('core:OperatingModeState')) {
            case 'standby':
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.OFF);
                this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
                break;
            case 'internal':
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.AUTO);
                this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                break;
            case 'external':
                this.targetState?.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
                this.currentState?.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
                break;
        }
    }
}