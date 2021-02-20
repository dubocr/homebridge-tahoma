
import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class AirSensor extends Mapper {
    protected quality: Characteristic | undefined;
    protected co2: Characteristic | undefined;
    
    protected registerServices() {
        const service = this.registerService(this.platform.Service.AirQualitySensor);
        this.quality = service.getCharacteristic(this.platform.Characteristic.AirQuality);
        this.co2 = service.addCharacteristic(this.platform.Characteristic.CarbonDioxideLevel);
    }

    protected onStateChange(name: string, value) {
        switch(name) {
            case 'core:CO2ConcentrationState':
                this.co2?.updateValue(value);
                this.quality?.updateValue(this.co2ToQuality(value));
                break;
        }
    }

    private co2ToQuality(value) {
        if(value < 350) {
            return this.platform.Characteristic.AirQuality.EXCELLENT;
        } else if(value < 1000) {
            return this.platform.Characteristic.AirQuality.GOOD;
        } else if(value < 2000) {
            return this.platform.Characteristic.AirQuality.FAIR;
        } else if(value < 5000) {
            return this.platform.Characteristic.AirQuality.INFERIOR;
        } else {
            return this.platform.Characteristic.AirQuality.POOR;
        }
    }
}