import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class TemperatureSensor extends Mapper {
    protected temperature: Characteristic | undefined;
    
    protected registerServices() {
        const service = this.registerService(this.platform.Service.TemperatureSensor);
        this.temperature = service.getCharacteristic(this.platform.Characteristic.CurrentTemperature);
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:TemperatureState':
                this.temperature?.updateValue(value > 200 ? (value - 273.15) : value);
                break;
        }
    }
}