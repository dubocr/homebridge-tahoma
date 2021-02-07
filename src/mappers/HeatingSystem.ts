import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import Mapper from '../Mapper';
import { ExecutionState, Command, Action } from 'overkiz-client';

export default class HeatingSystem extends Mapper {
    protected currentTemperature: Characteristic | undefined;
    protected targetTemperature: Characteristic | undefined;
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected onOff: Characteristic | undefined;
    
    protected registerServices() {
        const temperatureSensor = this.device.sensors.find((sensor) => sensor.uiClass === 'TemperatureSensor');
        if(temperatureSensor) {
            const service = this.registerService(this.platform.Service.Thermostat);
            this.currentTemperature = service.getCharacteristic(this.platform.Characteristic.CurrentTemperature);
            this.targetTemperature = service.getCharacteristic(this.platform.Characteristic.TargetTemperature);
            this.currentState = service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState);
            this.targetState = service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState);

            this.targetState.on('set', this.setTargetState);
            this.targetTemperature.on('set', this.debounce(this.setTargetTemperature));
        } else {
            const service = this.registerService(this.platform.Service.Switch);
            this.onOff = service.getCharacteristic(this.platform.Characteristic.On);

            this.onOff.on('set', this.setOnOff);
        }
    }

    protected get targetStateCommands() {
        return [];
    }

    protected get targetTemperatureCommands() {
        return [];
    }

    protected get onOffCommands() {
        return [];
    }

    protected async setTargetState(value, callback: CharacteristicSetCallback) {
        const execution = await this.executeCommands(this.targetStateCommands);
        execution.on(ExecutionState.COMPLETED, () => {
            if (this.stateless) {
                this.currentState?.updateValue(value);
            }
        });
        execution.on(ExecutionState.FAILED, () => this.currentState ? this.targetState?.updateValue(this.currentState.value) : null);
    }

    protected async setTargetTemperature(value, callback: CharacteristicSetCallback) {
        const execution = await this.executeCommands(this.targetTemperatureCommands);
        execution.on(ExecutionState.COMPLETED, () => {
            if (this.stateless) {
                this.currentTemperature?.updateValue(value);
            }
        });
        execution.on(ExecutionState.FAILED, () => this.currentTemperature ? this.targetTemperature?.updateValue(this.currentTemperature.value) : null);
    }

    protected async setOnOff(value, callback: CharacteristicSetCallback) {
        const execution = await this.executeCommands(this.onOffCommands);
        execution.on(ExecutionState.COMPLETED, () => {
            if (this.stateless) {
                this.onOff?.updateValue(value);
            }
        });
        execution.on(ExecutionState.FAILED, () => this.onOff?.updateValue(!value));
    }

    protected onStateChange(name: string, value) {
        switch(name) {
            case 'core:TemperatureState': this.currentTemperature?.updateValue(value > 273.15 ? (value - 273.15) : value); break;
        }
    }
}