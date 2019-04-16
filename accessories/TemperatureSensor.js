var Log, Service, Characteristic;
var Generic = require('./Generic');
var { Command, ExecutionState } = require('../overkiz-api');

class TemperatureSensor extends Generic {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device, config);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.TemperatureSensor(device.getName());
        this.temperatureState = this.service.getCharacteristic(Characteristic.CurrentTemperature);
        this.addService(this.service);
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