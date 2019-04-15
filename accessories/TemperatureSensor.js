var Generic, Characteristic, Command, ExecutionState;
Generic = require('./Generic');

module.exports = function(homebridge, log, api) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    return TemperatureSensor;
}

class TemperatureSensor extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.TemperatureSensor(device.getName());
        this.temperatureState = this.service.getCharacteristic(Characteristic.CurrentTemperature);
        this.services.push(this.service);
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