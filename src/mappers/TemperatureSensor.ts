import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class TemperatureSensor extends Mapper {
    protected temperature: Characteristic | undefined;

    protected registerMainService() {
        const service = this.registerService(Services.TemperatureSensor);
        this.temperature = service.getCharacteristic(Characteristics.CurrentTemperature);
        return service;
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:TemperatureState':
                this.temperature?.updateValue(value > 200 ? (value - 273.15) : value);
                break;
        }
    }
}