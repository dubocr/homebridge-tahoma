import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class Light extends Mapper {
    protected on: Characteristic | undefined;
    protected hue: Characteristic | undefined;
    protected brightness: Characteristic | undefined;
    protected saturation: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(this.platform.Service.Lightbulb);
        this.on = service.getCharacteristic(this.platform.Characteristic.On);
        this.hue = service.getCharacteristic(this.platform.Characteristic.Hue);
        this.brightness = service.getCharacteristic(this.platform.Characteristic.Brightness);
        this.saturation = service.getCharacteristic(this.platform.Characteristic.Saturation);

        this.on.on('set', this.setOn);
        this.brightness.on('set', this.setBrightness);
        this.saturation.on('set', this.setSaturation);
    }

    protected async setOn(value, callback: CharacteristicSetCallback) {
        const command = new Command(value ? 'on' : 'off');
        this.executeCommands(command, callback);
    }

    protected async setBrightness(value, callback: CharacteristicSetCallback) {
        const command = new Command('setIntensity', value);
        this.executeCommands(command, callback);
    }

    protected async setSaturation(value, callback: CharacteristicSetCallback) {
        const command = new Command('setHueAndSaturation', [ this.hue?.value, value]);
        this.executeCommands(command, callback);
    }
}