var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return SmokeSensor;
}

/**
 * Accessory "SmokeSensor"
 */
 
SmokeSensor = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.SmokeSensor(device.label);

    this.smokeState = service.getCharacteristic(Characteristic.SmokeDetected);
    
    this.services.push(service);
};

SmokeSensor.UUID = 'SmokeSensor';

SmokeSensor.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:SmokeState') {
            this.smokeState.updateValue(value == 'notDetected' ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED : Characteristic.SmokeDetected.SMOKE_DETECTED);
        }
    }
}