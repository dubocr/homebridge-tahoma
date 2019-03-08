var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return HumiditySensor;
}

/**
 * Accessory "HumiditySensor"
 */
 
HumiditySensor = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.HumiditySensor(device.label);

    this.humidityState = service.getCharacteristic(Characteristic.CurrentRelativeHumidity);
    
    this.services.push(service);
};

HumiditySensor.UUID = 'HumiditySensor';

HumiditySensor.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:RelativeHumidityState') {
        	this.humidityState.updateValue(value);
        }
    }
}