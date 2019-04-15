
module.exports = function(homebridge, log, api) {
    Generic = require('Generic')(homebridge, log, api);
    Characteristic = homebridge.hap.Characteristic;
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