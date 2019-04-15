var Generic, Characteristic, Command, ExecutionState;
Generic = require('./Generic');

module.exports = function(homebridge, log, api) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    return SmokeSensor;
}

class SmokeSensor extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.SmokeSensor(device.getName());
        this.smokeState = this.service.getCharacteristic(Characteristic.SmokeDetected);
        this.services.push(this.service);
    }

    onStateUpdate(name, value) {
        var smokeState = null;

        switch(name) {
            case 'core:SmokeState':
            switch(value) {
                case 'notDetected': smokeState = Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
                case 'detected': smokeState = Characteristic.SmokeDetected.SMOKE_DETECTED;
            }
            break;
        }

        if (this.smokeState != null && smokeState != null)
            this.smokeState.updateValue(smokeState);
    }
}    