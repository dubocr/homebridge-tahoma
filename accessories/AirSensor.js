var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return AirSensor;
}

/**
 * Accessory "AirSensor"
 */
 
  // TODO : Not tested
AirSensor = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.AirQualitySensor(device.label);
	service.addCharacteristic(Characteristic.CarbonDioxideLevel);
    this.co2State = service.getCharacteristic(Characteristic.CarbonDioxideLevel);
    
    this.services.push(service);
};

AirSensor.UUID = 'AirSensor';

AirSensor.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:CO2ConcentrationState') {
        	var val = value - 273.15;
            this.co2State.updateValue(val);
        }
    }
}