var Log, Service, Characteristic;
var Generic = require('./Generic');
var { Command, ExecutionState } = require('../overkiz-api');

class LightSensor extends Generic {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device, config);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.LightSensor(device.getName());
        this.lightState = this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel);
        this.addService(this.service);
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