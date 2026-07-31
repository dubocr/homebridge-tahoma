
import { Characteristics, Services } from '../Platform';
import { Characteristic, Service } from 'homebridge';
import Mapper from '../Mapper';

export default class AirSensor extends Mapper {
    protected quality: Characteristic | undefined;
    protected active: Characteristic | undefined;
    protected battery: Characteristic | undefined;
    protected fault: Characteristic | undefined;

    protected registerMainService(): Service {
        const service = this.registerService(Services.AirQualitySensor);
        this.quality = service.getCharacteristic(Characteristics.AirQuality);
        this.fault = service.getCharacteristic(Characteristics.StatusFault);
        if (this.device.hasState('core:SensorDefectState')) {
            this.fault = service.getCharacteristic(Characteristics.StatusFault);
            this.battery = service.getCharacteristic(Characteristics.StatusLowBattery);
        }
        if (this.device.hasState('core:StatusState')) {
            this.active = service.getCharacteristic(Characteristics.StatusActive);
        }
        return service;
    }

    protected onStateChanged(name: string, value: string) {
        switch (name) {
            case 'core:StatusState':
                this.active?.updateValue(value === 'available');
                break;
            case 'core:SensorDefectState':
                switch (value) {
                    case 'lowBattery':
                        this.battery?.updateValue(Characteristics.StatusLowBattery.BATTERY_LEVEL_LOW);
                        break;
                    case 'maintenanceRequired':
                    case 'dead':
                        this.fault?.updateValue(Characteristics.StatusFault.GENERAL_FAULT);
                        break;
                    case 'noDefect':
                        this.fault?.updateValue(Characteristics.StatusFault.NO_FAULT);
                        this.battery?.updateValue(Characteristics.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                        break;
                }
                break;
            case 'core:AirQualityState':
                switch (value) {
                    case "optimalAirRange":
                        this.quality?.updateValue(Characteristics.AirQuality.EXCELLENT);
                        break;
                    case "slightlyHumidRange":
                    case "slightlyDryAirRange":
                        this.quality?.updateValue(Characteristics.AirQuality.GOOD);
                        break;
                    case "dryAirRange":
                    case "slightlyHotAndHumidRange":
                        this.quality?.updateValue(Characteristics.AirQuality.FAIR);
                        break;
                    case "excessivelyDryAirRange":
                    case "highHumidityRange":
                    case "highTemperatureAndHumidityRange":
                        this.quality?.updateValue(Characteristics.AirQuality.INFERIOR);
                        break;
                    case "mouldsAndDustMitesRisk":
                    case "mouldsRisk":
                    case "temperatureOrHumidityOutOfAnalysisRange":
                        this.quality?.updateValue(Characteristics.AirQuality.POOR);
                        break;
                    case "error":
                        this.quality?.updateValue(Characteristics.AirQuality.UNKNOWN);
                        break;
                }
                break;
        }
    }
}
