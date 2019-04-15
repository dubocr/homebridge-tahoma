var Generic, Characteristic, Command, ExecutionState;
Generic = require('./Generic');

module.exports = function(homebridge, log, api) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    return LightSensor;
}

class LightSensor extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.LightSensor(device.getName());
        this.lightState = this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel);
        this.services.push(this.service);
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