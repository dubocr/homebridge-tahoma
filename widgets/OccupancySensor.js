var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return OccupancySensor;
}

/**
 * Accessory "OccupancySensor"
 */
 
OccupancySensor = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.OccupancySensor(device.label);

    this.occupancyState = service.getCharacteristic(Characteristic.OccupancyDetected);
    
    this.services.push(service);
};

OccupancySensor.UUID = 'OccupancySensor';

OccupancySensor.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:OccupancyState') {
            this.occupancyState.updateValue(value == 'personInside' ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
        }
    }
}