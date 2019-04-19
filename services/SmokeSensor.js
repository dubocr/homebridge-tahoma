var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class SmokeSensor extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.SmokeSensor(device.getName());
        this.smokeState = this.service.getCharacteristic(Characteristic.SmokeDetected);
    }

    onStateUpdate(name, value) {
        var smokeState = null;

        switch(name) {
            case 'core:SmokeState':
            switch(value) {
                case 'notDetected': smokeState = Characteristic.SmokeDetected.SMOKE_NOT_DETECTED; break;
                case 'detected': smokeState = Characteristic.SmokeDetected.SMOKE_DETECTED; break;
            }
            break;
        }

        if (this.smokeState != null && smokeState != null)
            this.smokeState.updateValue(smokeState);
    }
}

module.exports = SmokeSensor