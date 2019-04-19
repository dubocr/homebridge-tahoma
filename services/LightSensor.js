var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class LightSensor extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.LightSensor(device.getName());
        this.lightState = this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel);
    }

    onStateUpdate(name, value) {
        var lightState = null;

        switch(name) {
            case 'core:LuminanceState':
                lightState = value;
            break;
        }

        if (this.lightState != null && lightState != null)
            this.lightState.updateValue(lightState);
    }
}

module.exports = LightSensor