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
 
HeatingSystem = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.Thermostat(device.label);

    this.currentState = service.getCharacteristic(Characteristic.CurrentTemperature);
    this.targetState = service.getCharacteristic(Characteristic.TargetTemperature)
    this.targetState.on('set', this.setTemperature.bind(this));
    
    this.heatingCurrentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
    this.heatingTargetState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    this.heatingTargetState.on('set', this.setHeatingCooling.bind(this));
    
    this.services.push(service);
};

HeatingSystem.UUID = 'HeatingSystem';

HeatingSystem.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.TargetTemperature
	**/
    setTemperature: function(value, callback) {
        var that = this;
        
        var command = new OverkizCommand('setHeatingTargetTemperature');
		command.parameters = [value];
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                case ExecutionState.FAILED:
                    that.targetState.updateValue(that.currentState.value);
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
        
        var command = new OverkizCommand('setHeatingOnOffState');
		switch(value) {
			case Characteristic.TargetHeatingCoolingState.AUTO:
			case Characteristic.TargetHeatingCoolingState.HEAT:
			case Characteristic.TargetHeatingCoolingState.COOL:
				 command.parameters = ['on'];
			break;
			case Characteristic.TargetHeatingCoolingState.OFF:
			default:
				 command.parameters = ['off'];
			break;
		}
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                case ExecutionState.FAILED:
                    that.targetState.updateValue(that.currentState.value);
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
        if (name == State.STATE_HEATING_ON_OFF) {
        	var converted = value == 'off' ? Characteristic.CurrentHeatingCoolingState.OFF : Characteristic.CurrentHeatingCoolingState.HEAT;
        	
            this.heatingCurrentState.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.heatingTargetState.updateValue(converted);
        } else if (name == State.STATE_TARGET_TEMP) {
            this.currentState.updateValue(value);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetState.updateValue(value);
        }
    }
}