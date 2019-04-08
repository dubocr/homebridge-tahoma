var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return WaterHeatingSystem;
}

/**
 * Accessory "WaterHeatingSystem"
 */
 
 // TODO : Not implemented
WaterHeatingSystem = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.Thermostat(device.label);

    this.currentState = service.getCharacteristic(Characteristic.CurrentTemperature);
    this.targetState = service.getCharacteristic(Characteristic.TargetTemperature)
    this.targetState.on('set', this.setTemperature.bind(this));
    
    this.heatingCurrentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
    this.heatingTargetState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    this.heatingTargetState.on('set', this.setHeatingCooling.bind(this));
    
    this.targetState.setProps({ minValue: 40, maxValue: 60, minStep: 0.5 });
    
    this.services.push(service);
	
	for(command of this.device.definition.commands) {
		if(command.commandName == 'setBoostOnOffState')	{
			var boostService = new Service.Switch("BOOST - " + device.label);
			this.onState = service.getCharacteristic(Characteristic.On);
			this.onState.on('set', this.setBoost.bind(this));			
			this.services.push(boostService);
			break;
		}
	}
};

WaterHeatingSystem.UUID = 'WaterHeatingSystem';

WaterHeatingSystem.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.TargetTemperature
	**/
    setTemperature: function(value, callback) {
        var that = this;
        
        var command = new Command('setHeatingTargetTemperature', [value]);
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
        
        var command = new Command('setCurrentOperatingMode');
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
                break;
                case ExecutionState.FAILED:
                    that.heatingTargetState.updateValue(that.heatingCurrentState.value);
                    break;
                default:
                    break;
            }
        });
    },
	
	/**
	* Triggered when Homekit try to modify the Characteristic.On
	**/
    setBoost: function(value, callback) {
        var that = this;
        
        var command = new Command('setBoostOnOffState', value ? 'on' : 'off');
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                break;
                case ExecutionState.FAILED:
                    that.onState.updateValue(that.onState.value);
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
        if (name == "core:OperatingModeState") {
        	var converted = value == 'off' ? Characteristic.CurrentHeatingCoolingState.OFF : Characteristic.CurrentHeatingCoolingState.HEAT;
        	var target = value == 'off' ? Characteristic.TargetHeatingCoolingState.OFF : Characteristic.TargetHeatingCoolingState.HEAT;
            this.heatingCurrentState.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.heatingTargetState.updateValue(target);
        } else if (name == "core:BoostOnOffState" && this.onState != null) {
        	this.onState.updateValue(value == 'on');
        } else if (name == State.STATE_TARGET_TEMP) {
            this.currentState.updateValue(value);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetState.updateValue(value);
        }
    }
}