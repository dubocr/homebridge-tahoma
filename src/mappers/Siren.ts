import { Characteristics, Services } from '../Platform';
import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class Siren extends Mapper {
    protected mute: Characteristic | undefined;
    protected volume: Characteristic | undefined;

    protected registerMainService() {
        const service = this.registerService(Services.Speaker);
        this.mute = service.getCharacteristic(Characteristics.Mute);
        this.volume = service.getCharacteristic(Characteristics.Volume);

        this.mute.onSet(this.setMute.bind(this));
        this.volume.onSet(this.setVolume.bind(this));

        this.mute.updateValue(true);
        return service;
    }

    protected getMuteCommands(value): Command | Array<Command> {
        return new Command(value ? 'off' : 'on');
    }

    protected async setMute(value) {
        const action = await this.executeCommands(this.getMuteCommands(value));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    break;
                case ExecutionState.FAILED:
                    break;
            }
        });
    }

    protected getVolumeCommands(value): Command | Array<Command> {
        return new Command('setVolume', value);
    }

    protected async setVolume(value) {
        const action = await this.executeCommands(this.getVolumeCommands(value));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    break;
                case ExecutionState.FAILED:
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:OnOffState':
                this.mute?.updateValue(value === 'off');
                break;
        }
    }
}