var Log, Service, Characteristic;
var Generic = require('./Generic');
var { Command, ExecutionState } = require('../overkiz-api');

class HumiditySensor extends Generic {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device, config);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.HumiditySensor(device.getName());
        this.humidityState = this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity);
        this.addService(this.service);
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