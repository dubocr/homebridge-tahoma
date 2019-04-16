var Log, Service, Characteristic;
var Generic = require('./Generic');
var { Command, ExecutionState } = require('../overkiz-api');

class AirQualitySensor extends Generic {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device, config);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.AirQualitySensor(device.getName());

        this.service.addCharacteristic(Characteristic.CarbonDioxideLevel);
        this.co2State = this.service.getCharacteristic(Characteristic.CarbonDioxideLevel);
        this.addService(this.service);
    }

    onStateUpdate(name, value) {
        var co2State = null;

        switch(name) {
            case 'core:CO2ConcentrationState':
            co2State = value;
            break;
        }

        if (this.co2State != null && co2State != null)
            this.co2State.updateValue(co2State);
    }
}

module.exports = AirQualitySensor