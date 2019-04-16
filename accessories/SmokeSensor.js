var Log, Service, Characteristic;
var Generic = require('./Generic');
var { Command, ExecutionState } = require('../overkiz-api');

class SmokeSensor extends Generic {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device, config);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.SmokeSensor(device.getName());
        this.smokeState = this.service.getCharacteristic(Characteristic.SmokeDetected);
        this.addService(this.service);
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

module.exports = SmokeSensor