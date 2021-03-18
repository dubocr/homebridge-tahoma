
import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class AirSensor extends Mapper {
    protected quality: Characteristic | undefined;
    protected co2: Characteristic | undefined;
    
    protected registerServices() {
        const service = this.registerService(Services.AirQualitySensor);
        this.quality = service.getCharacteristic(Characteristics.AirQuality);
        this.co2 = this.registerCharacteristic(service, Characteristics.CarbonDioxideLevel);
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:CO2ConcentrationState':
                this.co2?.updateValue(value);
                this.quality?.updateValue(this.co2ToQuality(value));
                break;
        }
    }

    private co2ToQuality(value) {
        if(value < 350) {
            return Characteristics.AirQuality.EXCELLENT;
        } else if(value < 1000) {
            return Characteristics.AirQuality.GOOD;
        } else if(value < 2000) {
            return Characteristics.AirQuality.FAIR;
        } else if(value < 5000) {
            return Characteristics.AirQuality.INFERIOR;
        } else {
            return Characteristics.AirQuality.POOR;
        }
    }
}