import { Services } from '../../Platform.js';
import { Characteristic } from 'homebridge';
import { CurrentConsumptionCharacteristic, TotalConsumptionCharacteristic } from '../../CustomCharacteristics.js';
import ElectricitySensor from '../ElectricitySensor.js';


export default class CumulativeElectricPowerConsumptionSensor extends ElectricitySensor {

    protected consumption: Characteristic | undefined;
    protected power: Characteristic | undefined;

    protected registerMainService() {
        const service = super.registerMainService();
        service.addOptionalCharacteristic(TotalConsumptionCharacteristic);
        this.consumption = service.getCharacteristic(TotalConsumptionCharacteristic);
        service.addOptionalCharacteristic(CurrentConsumptionCharacteristic);
        this.power = service.getCharacteristic(CurrentConsumptionCharacteristic);
        return service;
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:ElectricEnergyConsumptionState':
                this.consumption?.updateValue(value / 1000);
                break;
            case 'core:ElectricPowerConsumptionState':
                this.power?.updateValue(value);
                break;
        }
    }
}