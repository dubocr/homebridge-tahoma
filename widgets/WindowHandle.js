var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return WindowHandle;
}

/**
 * Accessory "WindowHandle"
 */
 
WindowHandle = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.ContactSensor(device.label);

    this.contactState = service.getCharacteristic(Characteristic.ContactSensorState);
    
    this.services.push(service);
};

WindowHandle.UUID = 'WindowHandle';

WindowHandle.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:ThreeWayHandleDirectionState') {
            this.contactState.updateValue(value == 'closed' ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }
    }
}