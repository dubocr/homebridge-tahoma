var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class TemperatureSensor extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.TemperatureSensor(device.getName());
        this.temperatureState = this.service.getCharacteristic(Characteristic.CurrentTemperature);
    }

    onStateUpdate(name, value) {
        var temperatureState = null;

        switch(name) {
            case 'core:TemperatureState':
            temperatureState = value > 200 ? (value - 273.15) : value;
            break;
        }

        if (this.temperatureState != null && temperatureState != null)
            this.temperatureState.updateValue(temperatureState);
    }
}

module.exports = TemperatureSensor