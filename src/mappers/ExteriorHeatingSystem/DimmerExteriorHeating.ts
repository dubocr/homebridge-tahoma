import { Characteristic, Service } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import { Characteristics, Services } from '../../Platform';
import ExteriorHeatingSystem from '../ExteriorHeatingSystem';

export default class DimmerExteriorHeating extends ExteriorHeatingSystem {
    protected level: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(Services.Lightbulb);
        this.on = service.getCharacteristic(Characteristics.On);

        this.on.onSet(this.setOn.bind(this));

        this.level = service.getCharacteristic(Characteristics.Brightness);
        this.level.onSet(this.debounce(this.setBrightness));
    }

    protected async setBrightness(value) {
        const action = await this.executeCommands(new Command('setLevel', 100 - value));
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
        value = 100 - value;
        switch (name) {
            case 'core:LevelState':
                this.level?.updateValue(value);
                this.on?.updateValue(value === 0 ? 0 : 1);
                break;
        }
        return false;
    }
}