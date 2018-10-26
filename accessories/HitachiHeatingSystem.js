var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return HitachiHeatingSystem;
}

/**
 * Accessory "HitachiHeatingSystem"
 */
 
HitachiHeatingSystem = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    
    this.lastCurrentMode = Characteristic.CurrentHeatingCoolingState.HEAT;
    this.lastTargetMode = Characteristic.TargetHeatingCoolingState.AUTO;
    
    var service = new Service.Thermostat(device.label);

    this.currentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
    this.targetState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    this.targetState.on('set', this.setHeatingCoolingState.bind(this));
    
    this.currentTemperature = service.getCharacteristic(Characteristic.CurrentTemperature);
    this.currentTemperature.on('get', this.getTemperature.bind(this, "ovp:RoomTemperatureState"));
    this.targetTemperature = service.getCharacteristic(Characteristic.TargetTemperature);
	this.targetTemperature.on('set', this.setTemperature.bind(this));
	this.targetTemperature.on('get', this.getTemperature.bind(this, "ovp:TemperatureChangeState"));
		
    this.services.push(service);
};

HitachiHeatingSystem.UUID = 'HitachiHeatingSystem';

	/* Possible values */
	/*
	activeState =>
	Characteristic.Active.INACTIVE = 0;
	Characteristic.Active.ACTIVE = 1;

	targetState =>
	Characteristic.TargetHeatingCoolingState.OFF = 0;
	Characteristic.TargetHeatingCoolingState.HEAT = 1;
	Characteristic.TargetHeatingCoolingState.COOL = 2;
	Characteristic.TargetHeatingCoolingState.AUTO = 3;
	
	currentState =>
	Characteristic.CurrentHeatingCoolingState.OFF = 0;
	Characteristic.CurrentHeatingCoolingState.HEAT = 1;
	Characteristic.CurrentHeatingCoolingState.COOL = 2;
	
	ovp:ModeChangeState => "auto cooling","auto heating","circulator","cooling","dehumidify","fan","heating"
	ovp:MainOperationState => "on", "off"
	core:AutoManuModeState => "auto", "manu"
	*/
HitachiHeatingSystem.prototype = {

    /**
		* Triggered when Homekit try to modify the Characteristic.TargetHeaterCoolerState
		**/
    setHeatingCoolingState: function(value, callback) {
		var that = this;
		this.sendGlobalControl(value, this.targetTemperature.value, function(status, error, data) {
			switch (status) {
				case ExecutionState.INITIALIZED:
					callback(error);
					break;
				case ExecutionState.COMPLETED:
					break;
				case ExecutionState.FAILED:
					that.targetState.updateValue(that.currentState.value); // Restore current state if command failed
					break;
				default:
					break;
			}
		});
    },
    
    /**
		* Triggered when Homekit try to modify the Characteristic.TargetTemperature
		**/
    setTemperature: function(value, callback) {
		var that = this;
		this.sendGlobalControl(this.targetState.value, value, function(status, error, data) {
			switch (status) {
				case ExecutionState.INITIALIZED:
					callback(error);
					break;
				case ExecutionState.COMPLETED:
					break;
				case ExecutionState.FAILED:
					break;
				default:
					break;
			}
		});
    },
    
    sendGlobalControl: function(state, temperature, callback) {
		var onOff = "on";
		var fanMode = "auto";
		var progMode = "manu";
		var heatMode = "auto";
		var autoTemp = Math.max(Math.min(temperature - this.currentTemperature.value, 5), -5);

		switch(state) {
	
			case Characteristic.TargetHeatingCoolingState.OFF:
				onOff = "off";
				switch(this.currentState.value) {
					case Characteristic.CurrentHeatingCoolingState.AUTO:
						heatMode = "auto";
						temperature = autoTemp;
						break;
					case Characteristic.CurrentHeatingCoolingState.HEAT:
						heatMode = "heating";
						break;
					case Characteristic.CurrentHeatingCoolingState.COOL:
						heatMode = "cooling";
						break;
					default:
						temperature = autoTemp;
						break;
				}
				break;
	
			case Characteristic.TargetHeatingCoolingState.HEAT:
				heatMode = "heating";
				break;
	
			case Characteristic.TargetHeatingCoolingState.COOL:
				 heatMode = "cooling";
				break;
	
			case Characteristic.TargetHeatingCoolingState.AUTO:
				heatMode = "auto";
				temperature = autoTemp;
				break;
	
			default:
				temperature = autoTemp;
				break;
		}
		
		this.log("FROM " + this.currentState.value + '/' + this.currentTemperature.value + ' TO ' + state + '/' + temperature);

		var command = new Command('globalControl', [onOff, temperature, fanMode, heatMode, progMode]);
		this.executeCommand(command, callback);
    },
    
    getTemperature : function(state, callback) {
    	var that = this;
    	this.api.requestState(this.device.deviceURL, state, function(error, data) {
    		if(!error) {
    			var converted = parseInt(data.replace(" °C").replace(" °F"););
    			if (state == "ovp:TemperatureChangeState" && converted <= 5) {
        			converted = converted + that.currentTemperature.value;
        		}
    			that.log("GET " + state + " => " + converted);
    			callback(null, converted);
    		} else {
    			callback(error);
    		}
    	});
    },
    
    onStateUpdate: function(name, value) {
      	if (name == "ovp:ModeChangeState") {
			switch(value.toLowerCase()) {
				case "auto cooling":
					this.lastCurrentMode = Characteristic.CurrentHeatingCoolingState.COOL;
					this.lastTargetMode = Characteristic.TargetHeatingCoolingState.AUTO;
					break;
				case "auto heating":
					this.lastCurrentMode = Characteristic.CurrentHeatingCoolingState.HEAT;
					this.lastTargetMode = Characteristic.TargetHeatingCoolingState.AUTO;
					break;
				case "cooling":
					this.lastCurrentMode = Characteristic.CurrentHeatingCoolingState.COOL;
					this.lastTargetMode = Characteristic.TargetHeatingCoolingState.COOL;
					break;
				case "heating":
					this.lastCurrentMode = Characteristic.CurrentHeatingCoolingState.HEAT;
					this.lastTargetMode = Characteristic.TargetHeatingCoolingState.HEAT;
					break;
			}
					
        	if (this.currentState.value != Characteristic.CurrentHeatingCoolingState.OFF) {
				this.currentState.updateValue(this.lastCurrentMode);
				if (!this.isCommandInProgress()) // if no command running, update target
					this.targetState.updateValue(this.lastTargetMode);
        	}
        } else if (name == "ovp:MainOperationState") {
        	var converted = value.toLowerCase() == "off" ? Characteristic.CurrentHeatingCoolingState.OFF : this.lastCurrentMode;
			var targetConverted = value.toLowerCase() == "off" ? Characteristic.TargetHeatingCoolingState.OFF : this.lastTargetMode;
			this.currentState.updateValue(converted);
			if (!this.isCommandInProgress()) // if no command running, update target
          		this.targetState.updateValue(targetConverted);
        } else if (name == "ovp:RoomTemperatureState") {
        	var converted = parseInt(value.replace(" °C").replace(" °F"));
        	this.currentTemperature.updateValue(converted);
        } else if (name == "ovp:TemperatureChangeState") {
        	var converted = parseInt(value.replace(" °C").replace(" °F"));
        	if(converted <= 5) 
        		converted = converted + this.currentTemperature.value;
        	this.log("ovp:TemperatureChangeState => " + converted);
        	this.targetTemperature.updateValue(converted);
        }
    }
}