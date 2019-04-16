var Log, Service, Characteristic;
var Generic = require('./Generic');
var { Command, ExecutionState } = require('../overkiz-api');

class ContactSensor extends Generic {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device, config);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.ContactSensor(device.getName());
        this.contactState = this.service.getCharacteristic(Characteristic.ContactSensorState);
        this.addService(this.service);
    }

    onStateUpdate(name, value) {
        var contactState = null;

        switch(name) {
            case 'core:ThreeWayHandleDirectionState':
            case 'core:ContactState':
            switch(value) {
                case 'closed': contactState = Characteristic.ContactSensorState.CONTACT_DETECTED;
                case 'tilt':
                case 'open': contactState = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            }
            break;
        }

        if (this.contactState != null && contactState != null)
            this.contactState.updateValue(contactState);
    }
}

module.exports = ContactSensor