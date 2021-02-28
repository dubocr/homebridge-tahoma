import { Characteristics, Services } from '../../Platform';
import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticElectricalTowelDryer extends HeatingSystem {   
    protected drying: Characteristic | undefined;

    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ validValues: [
            Characteristics.TargetHeatingCoolingState.AUTO,
            Characteristics.TargetHeatingCoolingState.HEAT,
            Characteristics.TargetHeatingCoolingState.OFF,
        ] });
        if(this.device.hasCommand('setTowelDryerBoostModeDuration')) {
            this.registerSwitchService('boost');
        }
        if(this.device.hasCommand('setDryingDuration')) {
            const service = this.registerService(Services.Switch, 'drying');
            this.drying = service.getCharacteristic(Characteristics.On);
            
            this.drying?.on('set', this.setDrying.bind(this));
        }
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        const commands = new Array<Command>();
        switch(value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('setTowelDryerOperatingMode', 'internal'));
                break;
            case Characteristics.TargetHeatingCoolingState.HEAT:
                commands.push(new Command('setTowelDryerOperatingMode', 'external'));
                break;
            case Characteristics.TargetHeatingCoolingState.OFF:
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
        switch(name) {
            case 'core:TemperatureState': this.onTemperatureUpdate(value); break;
            case 'core:TargetTemperatureState': this.targetTemperature?.updateValue(value); break;
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
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.OFF);
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                break;
            case 'internal':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.AUTO);
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                break;
            case 'external':
                this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.HEAT);
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                break;
        }
    }
}