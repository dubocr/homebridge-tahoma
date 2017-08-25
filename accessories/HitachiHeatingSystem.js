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
    var service = new Service.Thermostat(device.label);

    this.currentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
    this.targetState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    this.targetState.on('set', this.setHeatingCoolingState.bind(this));
    
    this.currentTemperature = service.getCharacteristic(Characteristic.CurrentTemperature);
    this.targetTemperature = service.getCharacteristic(Characteristic.TargetTemperature);
	this.targetTemperature.on('set', this.setTemperature.bind(this));
		
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
        this.fanMode = "auto";
        this.progMode = "manu";
        
        var command = new Command('globalControl');
		switch(value) {
			case Characteristic.TargetHeatingCoolingState.OFF:
				command = new Command('setMainOperation');
				command.parameters = ["off"];
			break;
			case Characteristic.TargetHeatingCoolingState.HEAT:
				command.parameters = ["on",this.targetTemperature.value,this.fanMode,"heating",this.progMode];
			break;
			case Characteristic.TargetHeatingCoolingState.COOL:
				 command.parameters = ["on",this.targetTemperature.value,this.fanMode,"cooling",this.progMode];
			break;
			case Characteristic.TargetHeatingCoolingState.AUTO:
			default:
				 var diff = this.targetTemperature.value - this.currentTemperature.value;
				 if (diff < -5) diff = -5;
				 if (diff > 5) diff = 5;
				 command.parameters = ["on",diff,this.fanMode,"auto",this.progMode];
			break;
		}

		that.targetState.updateValue(value);

        this.executeCommand(command, function(status, error, data) {
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
        
        this.fanMode = "auto";
        this.progMode = "manu";
				
		var command = new Command('globalControl');
				switch(this.currentState.value) {
					case Characteristic.CurrentHeatingCoolingState.HEAT:
						command.parameters = ["on",this.targetTemperature.value,this.fanMode,"heating",this.progMode];
					break;
					case Characteristic.CurrentHeatingCoolingState.COOL:
						 command.parameters = ["on",this.targetTemperature.value,this.fanMode,"cooling",this.progMode];
					break;
					case Characteristic.CurrentHeatingCoolingState.OFF:
						if (!this.isCommandInProgress()) // if no command running, update target
							this.targetState.updateValue(Characteristic.TargetHeatingCoolingState.AUTO);
					case Characteristic.CurrentHeatingCoolingState.AUTO:
					default:
						 var diff = value - this.currentTemperature.value;
						 if (diff < -5) diff = -5;
						 if (diff > 5) diff = 5;
						 command.parameters = ["on",diff,this.fanMode,"auto",this.progMode];
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
                    break;
                default:
                    break;
            }
        });
    },
    


    onStateUpdate: function(name, value) {
        if (name == "ovp:ModeChangeState") {
        		if (this.currentState.value != Characteristic.CurrentHeatingCoolingState.OFF) {
		
					var converted, convertedTarget;
					switch(value.toLowerCase()) {
						case "auto cooling":
							converted = Characteristic.CurrentHeatingCoolingState.COOL;
							convertedTarget = Characteristic.TargetHeatingCoolingState.AUTO;
						break;
						case "auto heating":
							converted = Characteristic.CurrentHeatingCoolingState.HEAT;
							convertedTarget = Characteristic.TargetHeatingCoolingState.AUTO;
						break;
						case "cooling":
							converted = Characteristic.CurrentHeatingCoolingState.COOL;
							convertedTarget = Characteristic.TargetHeatingCoolingState.COOL;
						break;
						case "heating":
							converted = Characteristic.CurrentHeatingCoolingState.HEAT;
							convertedTarget = Characteristic.TargetHeatingCoolingState.HEAT;
						break;
					}
				this.currentState.updateValue(converted);
				if (!this.isCommandInProgress()) // if no command running, update target
					this.targetState.updateValue(convertedTarget);
				
            }
        } else if (name == "ovp:MainOperationState") {
       		var converted = value == "Off" ? Characteristic.CurrentHeatingCoolingState.OFF : Characteristic.CurrentHeatingCoolingState.COOL;
            this.currentState.updateValue(converted);
        } else if (name == "ovp:RoomTemperatureState") {
        	this.currentTemperature.updateValue(value.substring(0,value.length-3));
        } else if (name == "ovp:TemperatureChangeState") {
        	var converted = value.substring(0,value.length-3);
        	if (+converted < 6) 
        		converted = +converted + +this.currentTemperature.value;
        	if (this.targetTemperature.value == "10") //Default Homekit Target Value at launch
	        	this.targetTemperature.updateValue(converted);
        }
    }
}