var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return HeatingSystem;
}

/**
 * Accessory "HeatingSystem"
 */
 
  // TODO : Not tested
EvoHome = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
	this.currentHumidity = null;
	this.temperature = config[this.name] || {};
	this.tempComfort = this.temperature.comfort || 19;
	this.tempEco = this.temperature.eco || 17;
	
    if(this.device.widget == 'HeatingSetPoint') {
		var service = new Service.Thermostat(device.label);
		
		this.currentState = service.getCharacteristic(Characteristic.CurrentTemperature);
		this.targetState = service.getCharacteristic(Characteristic.TargetTemperature)
		this.targetState.on('set', this.setTemperature.bind(this));
		
		this.heatingCurrentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
		this.heatingTargetState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
		this.heatingTargetState.on('set', this.setHeatingCooling.bind(this));
    }
    
	this.service = service;
    this.services.push(service);
};

EvoHome.UUID = 'EvoHome';

EvoHome.prototype = {

	merge: function(device) {
		
    },
	
	/**
	* Triggered when Homekit try to modify the Characteristic.TargetTemperature
	**/
    setTemperature: function(value, callback) {
        var that = this;
        
        var command = new Command('setTargetTemperature', [value]);
        
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                case ExecutionState.FAILED:
                    break;
                default:
                    break;
            }
        });
    },
    
    /**
	* Triggered when Homekit try to modify the Characteristic.TargetHeatingCoolingState
	**/
    setHeatingCooling: function(value, callback) {
        var that = this;
        
        var commands = [];
        
		switch(value) {
			case Characteristic.TargetHeatingCoolingState.AUTO:
				commands.push(new Command('setSetpointOverride', ['auto', 'auto', 'auto']));
				break;
			
			case Characteristic.TargetHeatingCoolingState.HEAT:
				commands.push(new Command('setSetpointOverride', ['auto', 'auto', 'auto']));
				break;
			
			case Characteristic.TargetHeatingCoolingState.COOL:
				commands.push(new Command('setSetpointOverride', ['auto', 'auto', 'auto']));
				break;
			
			case Characteristic.TargetHeatingCoolingState.OFF:
				commands.push(new Command('setSetpointOverride', ['auto', 'auto', 'auto']));
				break;
			
			default:
				callback("Bad command");
				break;
		}

        this.executeCommand(commands, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                	break;
                case ExecutionState.FAILED:
                    that.heatingTargetState.updateValue(that.heatingCurrentState.value);
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
		if (name == 'core:TemperatureState') { // From merged TemperatureSensor
			var converted = value > 273.15 ? (value - 273.15) : value;
			this.currentState.updateValue(converted);
		} else if (name == 'core:TargetTemperatureState') {
			this.targetState.updateValue(value);
		}
    }
}