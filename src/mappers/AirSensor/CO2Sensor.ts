import { Characteristics } from '../../Platform';
import { Characteristic } from 'homebridge';
import AirSensor from '../AirSensor';

export default class RelativeHumiditySensor extends AirSensor {
    protected co2: Characteristic | undefined;

    protected registerMainService() {
        const service = super.registerMainService();
        service.addOptionalCharacteristic(Characteristics.CarbonDioxideLevel);
        this.co2 = service.getCharacteristic(Characteristics.CarbonDioxideLevel);
        return service;
    }

    

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:CO2ConcentrationState':
                this.co2?.updateValue(value);
                this.quality?.updateValue(this.co2ToQuality(value));
                break;
        }
    }

    private co2ToQuality(value) {
        if (value < 350) {
            return Characteristics.AirQuality.EXCELLENT;
        } else if (value < 1000) {
            return Characteristics.AirQuality.GOOD;
        } else if (value < 2000) {
            return Characteristics.AirQuality.FAIR;
        } else if (value < 5000) {
            return Characteristics.AirQuality.INFERIOR;
        } else {
            return Characteristics.AirQuality.POOR;
        }
    }
}