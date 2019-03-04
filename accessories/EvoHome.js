var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return EvoHome;
}

/**
 * Accessory "EvoHome"
 */
 
  // TODO : Not tested
EvoHome = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);

    if(this.device.widget == 'HeatingSetPoint') {
		var service = new Service.Thermostat(device.label);
		
		this.currentState = service.getCharacteristic(Characteristic.CurrentTemperature);
		this.targetState = service.getCharacteristic(Characteristic.TargetTemperature)
		this.targetState.on('set', this.setTemperature.bind(this));
		
		this.heatingCurrentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
		this.heatingCurrentState.updateValue(Characteristic.CurrentHeatingCoolingState.HEAT);
		this.heatingTargetState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState);
		this.heatingTargetState.updateValue(Characteristic.TargetHeatingCoolingState.AUTO);
		//this.heatingTargetState.on('set', this.setHeatingCooling.bind(this));
		
    	this.services.push(service);
    } else if(this.device.widget == 'EvoHomeController') {
		var service = new Service.Thermostat(device.label);
		
		this.currentState = service.getCharacteristic(Characteristic.CurrentTemperature);
		this.targetState = service.getCharacteristic(Characteristic.TargetTemperature);
		this.currentState.updateValue(0);
		this.targetState.updateValue(0);
		//this.targetState.on('set', this.setTemperature.bind(this));
		
		this.heatingCurrentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
		this.heatingTargetState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
		this.heatingTargetState.on('set', this.setHeatingCooling.bind(this));
		
    	this.services.push(service);
    }
    
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
        var command = null;
        
		switch(value) {
			case Characteristic.TargetHeatingCoolingState.AUTO:
			case Characteristic.TargetHeatingCoolingState.HEAT:
			case Characteristic.TargetHeatingCoolingState.COOL:
				command = new Command('setOperatingMode', ['auto']);
				break;

			case Characteristic.TargetHeatingCoolingState.OFF:
				command = new Command('setOperatingMode', ['off']);
				break;
			
			default:
				callback("Bad command");
				break;
		}
		if(command == null) {
			return;
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

    onStateUpdate: function(name, value) {
		if (name == 'core:TemperatureState') { // From merged TemperatureSensor
			var converted = value > 273.15 ? (value - 273.15) : value;
			this.currentState.updateValue(converted);
		} else if (name == 'core:TargetTemperatureState') {
			this.targetState.updateValue(value);
		} else if (name == 'ramses:RAMSESOperatingModeState') {
			switch(value) {
				case 'auto':
					this.heatingCurrentState.updateValue(Characteristic.CurrentHeatingCoolingState.HEAT);
				break;
				case 'eco':
					this.heatingCurrentState.updateValue(Characteristic.CurrentHeatingCoolingState.COOL);
				break;
				case 'holidays':
				case 'off':
				default:
					this.heatingCurrentState.updateValue(Characteristic.CurrentHeatingCoolingState.OFF);
				break;
			}
			if(!this.isCommandInProgress()) {
				switch(value) {
					case 'auto':
					case 'eco':
						this.heatingTargetState.updateValue(Characteristic.TargetHeatingCoolingState.AUTO);
					break;
					case 'holidays':
					case 'off':
					default:
						this.heatingTargetState.updateValue(Characteristic.TargetHeatingCoolingState.OFF);
					break;
				}
			}
		}
    }
}