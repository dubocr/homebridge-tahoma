import { Characteristics, Services } from '../Platform';
import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class Light extends Mapper {
    protected on: Characteristic | undefined;
    protected hue: Characteristic | undefined;
    protected brightness: Characteristic | undefined;
    protected saturation: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(Services.Lightbulb);
        this.on = service.getCharacteristic(Characteristics.On);
        this.hue = service.getCharacteristic(Characteristics.Hue);
        this.brightness = service.getCharacteristic(Characteristics.Brightness);
        this.saturation = service.getCharacteristic(Characteristics.Saturation);

        this.on.on('set', this.setOn.bind(this));
        this.brightness.on('set', this.setBrightness.bind(this));
        this.saturation.on('set', this.setSaturation.bind(this));
    }

    protected getOnOffCommands(value): Command | Array<Command> {
        return new Command(value ? 'on' : 'off');
    }

    protected async setOn(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getOnOffCommands(value));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    callback();
                    break;
                case ExecutionState.FAILED:
                    callback(data);
                    break;
            }
        });
    }

    protected getBrightnessCommands(value): Command | Array<Command> {
        return new Command('setIntensity', value);
    }

    protected async setBrightness(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getBrightnessCommands(value));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    callback();
                    break;
                case ExecutionState.FAILED:
                    callback(data);
                    break;
            }
        });
    }

    protected getSaturationCommands(value): Command | Array<Command> {
        return new Command('setHueAndSaturation', [ this.hue?.value, value]);
    }

    protected async setSaturation(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getSaturationCommands(value));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    callback();
                    break;
                case ExecutionState.FAILED:
                    callback(data);
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value): boolean {
        switch(name) {
            case 'core:OnOffState':
                this.on?.updateValue(value === 'on');
                break;
            case 'core:IntensityState':
            case 'core:LightIntensityState':
                this.brightness?.updateValue(value);
                break;
            case 'core:ColorHueState':
                this.hue?.updateValue(value);
                break;
            case 'core:ColorSaturationState':
                this.saturation?.updateValue(value);
                break;
        }
        return false;
    }
}