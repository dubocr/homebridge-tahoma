
module.exports = function(homebridge, log, api) {
    Generic = require('Generic')(homebridge, log, api);
    Characteristic = homebridge.hap.Characteristic;
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