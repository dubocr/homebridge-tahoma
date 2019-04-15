var Generic, Characteristic, Command, ExecutionState;
Generic = require('./Generic');

module.exports = function(homebridge, log, api) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    return HumiditySensor;
}

class HumiditySensor extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.HumiditySensor(device.getName());
        this.humidityState = this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity);
        this.services.push(this.service);
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