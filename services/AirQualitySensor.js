var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class AirQualitySensor extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.AirQualitySensor(device.getName());

        this.quality = this.service.getCharacteristic(Characteristic.AirQuality);
        
        this.service.addCharacteristic(Characteristic.CarbonDioxideLevel);
        this.co2State = this.service.getCharacteristic(Characteristic.CarbonDioxideLevel);
    }

    onStateUpdate(name, value) {
        var co2State = null, quality = null;

        switch(name) {
            case 'core:CO2ConcentrationState':
            co2State = value;
            if(value < 350)
            	quality = Characteristic.AirQuality.EXCELLENT;
            else if(value < 1000)
            	quality = Characteristic.AirQuality.GOOD;
            else if(value < 2000)
            	quality = Characteristic.AirQuality.FAIR;
            else if(value < 5000)
            	quality = Characteristic.AirQuality.INFERIOR;
            else
            	quality = Characteristic.AirQuality.POOR;
            break;
        }

        if (this.co2State != null && co2State != null)
            this.co2State.updateValue(co2State);
        if (this.quality != null && quality != null)
            this.quality.updateValue(quality);
    }
}

module.exports = AirQualitySensor