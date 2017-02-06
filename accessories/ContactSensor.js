var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return ContactSensor;
}

/**
 * Accessory "ContactSensor"
 */
 
ContactSensor = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.ContactSensor(device.label);

    this.contactState = service.getCharacteristic(Characteristic.ContactSensorState);
    
    this.services.push(service);
};

ContactSensor.UUID = 'ContactSensor';

ContactSensor.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:ContactState') {
            this.contactState.updateValue(value == 'closed' ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }
    }
}