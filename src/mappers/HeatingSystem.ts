import { Characteristic, Service } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class HeatingSystem extends Mapper {
    protected currentTemperature: Characteristic | undefined;
    protected targetTemperature: Characteristic | undefined;
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected on: Characteristic | undefined;

    protected derogationDuration;
    protected comfortTemperature;
    protected ecoTemperature;
    
    protected applyConfig(config) {
        this.derogationDuration = config['derogationDuration'] || 1;
        this.comfortTemperature = config['comfort'] || 19;
        this.ecoTemperature = config['eco'] || 17;
    }

    protected registerThermostatService(subtype?: string): Service {
        const service = this.registerService(this.platform.Service.Thermostat, subtype);
        this.currentTemperature = service.getCharacteristic(this.platform.Characteristic.CurrentTemperature);
        this.targetTemperature = service.getCharacteristic(this.platform.Characteristic.TargetTemperature);
        this.currentState = service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState);
        this.targetState = service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState);
        
        this.targetState?.on('set', this.setTargetState.bind(this));
        this.targetTemperature?.on('set', this.debounce(this.setTargetTemperature));
        return service;
    }

    protected registerSwitchService(subtype?: string): Service {
        const service = this.registerService(this.platform.Service.Switch, subtype);
        this.on = service.getCharacteristic(this.platform.Characteristic.On);
        
        this.on?.on('set', this.setOn.bind(this));
        return service;
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch(value) {
            case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
                return new Command('auto');
            case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
                return new Command('heat');
            case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
                return new Command('cool');
            case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
                return new Command('off');
            default:
                return new Command('auto');
        }
    }

    protected async setTargetState(value, callback) {
        const action = await this.executeCommands(this.getTargetStateCommands(value), callback);
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    this.currentState?.updateValue(value);
                    break;
                case ExecutionState.FAILED:
                    this.targetState?.updateValue(!value);
                    break;
            }
        });
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        return new Command('setTargetTemperature', value);
    }

    protected async setTargetTemperature(value, callback) {
        const action = await this.executeCommands(this.getTargetTemperatureCommands(value), callback);
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    this.currentTemperature?.updateValue(value);
                    break;
                case ExecutionState.FAILED:
                    this.targetTemperature?.updateValue(!value);
                    break;
            }
        });
    }

    protected getOnCommands(value): Command | Array<Command> {
        return new Command('setOn', value);
    }

    protected async setOn(value, callback) {
        const action = await this.executeCommands(this.getOnCommands(value), callback);
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.FAILED:
                    this.on?.updateValue(!value);
                    break;
            }
        });
    }

    protected onTemperatureUpdate(value) {
        this.currentTemperature?.updateValue(value > 273.15 ? (value - 273.15) : value);
    }

    protected onStateChanged(name: string, value) {
        this.debug(name + ' => ' + value);
        switch(name) {
            case 'core:TemperatureState': this.onTemperatureUpdate(value); break;
        }
    }
}