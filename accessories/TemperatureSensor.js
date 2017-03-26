var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return TemperatureSensor;
}

/**
 * Accessory "TemperatureSensor"
 */
 
TemperatureSensor = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.TemperatureSensor(device.label);

    this.temperatureState = service.getCharacteristic(Characteristic.CurrentTemperature);
    
    this.services.push(service);
};

TemperatureSensor.UUID = 'TemperatureSensor';

TemperatureSensor.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:TemperatureState') {
        	var val = Math.round(value * 10) / 100;
        	if(val >= 0 && val <= 100)
            	this.temperatureState.updateValue(val);
            else
            	this.log('['+this.name+'] Outbound temperature value : ' + val);
        }
    }
}