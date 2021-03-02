import { Characteristics, Services } from '../Platform';
import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class OnOff extends Mapper {
    protected on: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(Services.Switch);
        this.on = service.getCharacteristic(Characteristics.On);

        this.on.onSet(this.setOn.bind(this));
    }

    protected getOnOffCommands(value): Command | Array<Command> {
        return new Command(value ? 'on' : 'off');
    }

    protected async setOn(value) {
        const action = await this.executeCommands(this.getOnOffCommands(value));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    break;
                case ExecutionState.FAILED:
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value): boolean {
        switch(name) {
            case 'core:OnOffState':
                this.on?.updateValue(value === 'on');
                break;
        }
        return false;
    }
}