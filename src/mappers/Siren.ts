import { Characteristics, Services } from '../Platform';
import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class Siren extends Mapper {
    protected mute: Characteristic | undefined;
    protected volume: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(Services.Speaker);
        this.mute = service.getCharacteristic(Characteristics.Mute);
        this.volume = service.getCharacteristic(Characteristics.Volume);

        this.mute.on('set', this.setMute.bind(this));
        this.volume.on('set', this.setVolume.bind(this));

        this.mute.updateValue(true);
    }

    protected getMuteCommands(value): Command | Array<Command> {
        return new Command(value ? 'off' : 'on');
    }

    protected async setMute(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getMuteCommands(value));
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

    protected getVolumeCommands(value): Command | Array<Command> {
        return new Command('setVolume', value);
    }

    protected async setVolume(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getVolumeCommands(value));
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

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:OnOffState':
                this.mute?.updateValue(value === 'off');
                break;
        }
    }
}