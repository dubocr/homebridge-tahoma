var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return LightSensor;
}

/**
 * Accessory "LightSensor"
 */
 
LightSensor = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.LightSensor(device.label);

    this.lightState = service.getCharacteristic(Characteristic.CurrentAmbientLightLevel);
    
    this.services.push(service);
};

LightSensor.UUID = 'LightSensor';

LightSensor.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:LuminanceState') {
        	if(value >= 0.0001 && value <= 100000)
            	this.lightState.updateValue(value);
            else
            	this.log('['+this.name+'] Outbound luminance value : ' + value);
        }
    }
}