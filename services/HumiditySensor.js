var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class HumiditySensor extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.HumiditySensor(device.getName());
        this.humidityState = this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity);
    }

    onStateUpdate(name, value) {
        var humidityState = null;

        switch(name) {
            case 'core:RelativeHumidityState':
                humidityState = value;
            break;
        }

        if (this.humidityState != null && humidityState != null)
            this.humidityState.updateValue(humidityState);
    }
}

module.exports = HumiditySensor