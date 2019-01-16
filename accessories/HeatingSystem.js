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
HeatingSystem = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
	this.currentHumidity = null;
	
    if(this.device.widget == 'SomfyPilotWireElectricalHeater') {
    	var service = new Service.Switch(device.label);

		this.onState = service.getCharacteristic(Characteristic.On);
		this.onState.on('set', this.setHeatingLevel.bind(this));	
    } else {
		var service = new Service.Thermostat(device.label);
		
		this.currentState = service.getCharacteristic(Characteristic.CurrentTemperature);
		this.targetState = service.getCharacteristic(Characteristic.TargetTemperature)
		this.targetState.on('set', this.setTemperature.bind(this));
		this.targetState.setProps({ minValue: 15, maxValue: 26 });
		
		this.heatingCurrentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
		this.heatingTargetState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
		this.heatingTargetState.on('set', this.setHeatingCooling.bind(this));
    }
    
	this.service = service;
    this.services.push(service);
};

HeatingSystem.UUID = 'HeatingSystem';

HeatingSystem.prototype = {

	merge: function(device) {
		if(this.currentHumidity == null && device.UUID == 'HumiditySensor') {
			this.currentHumidity = this.service.addCharacteristic(Characteristic.CurrentRelativeHumidity);
		}
    },
	
	/**
	* Triggered when Homekit try to modify the Characteristic.TargetTemperature
	**/
    setTemperature: function(value, callback) {
        var that = this;
        
        var command = null;
        switch(this.device.widget) {
        	case 'SomfyHeatingTemperatureInterface':
        		if(this.setPointMode == 'comfort')
        			command = new Command('setComfortTemperature', [value]);
        		else
        			command = new Command('setEcoTemperature', [value]);
        		break;
        	
        	case 'SomfyPilotWireHeatingInterface':
        		callback("Bad command");
        		break;
        		
        	case 'ProgrammableAndProtectableThermostatSetPoint':
        		command = new Command('setTargetTemperature', [value]);
        		break;
				
			case 'SomfyThermostat':
					//command = new Command('setModeTemperature', [this.activeMode, value]);
					command = new Command('setDerogation', [value, 'further_notice']);
        		break;
        	
        	default:
        		command = new Command('setHeatingTargetTemperature', [value]);
        		break;
        }
        
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
        
        switch(this.device.widget) {
        	case 'SomfyHeatingTemperatureInterface':
        		switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
						if(this.onOff == 'off')
							commands.push(new Command('setOnOff', ['on']));
						commands.push(new Command('setActiveMode', ['auto']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.HEAT:
						if(this.onOff == 'off')
							commands.push(new Command('setOnOff', ['on']));
						commands.push(new Command('setManuAndSetPointModes', ['comfort']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.COOL:
						if(this.onOff == 'off')
							commands.push(new Command('setOnOff', ['on']));
						commands.push(new Command('setManuAndSetPointModes', ['eco']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.OFF:
						commands.push(new Command('setOnOff', ['off']));
						break;
					
					default:
						callback("Bad command");
						break;
				}
        		break;
        	
        	case 'SomfyPilotWireHeatingInterface':
        		switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
						if(this.onOff == 'off')
							commands.push(new Command('setOnOff', ['on']));
						commands.push(new Command('setActiveMode', ['auto']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.HEAT:
						if(this.onOff == 'off')
							commands.push(new Command('setOnOff', ['on']));
						//commands.push(new Command('setActiveMode', ['manu']));
						commands.push(new Command('setSetPointMode', ['comfort']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.COOL:
						if(this.onOff == 'off')
							commands.push(new Command('setOnOff', ['on']));
						//commands.push(new Command('setActiveMode', ['manu']));
						commands.push(new Command('setSetPointMode', ['eco']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.OFF:
						commands.push(new Command('setOnOff', ['off']));
						break;
					
					default:
						callback("Bad command");
						break;
				}
        		break;
				
			case 'SomfyThermostat':
        		switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
						commands.push(new Command('exitDerogation'));
						break;
					
					case Characteristic.TargetHeatingCoolingState.HEAT:
						commands.push(new Command('setDerogation', ['atHomeMode', 'further_notice']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.COOL:
						commands.push(new Command('setDerogation', ['sleepingMode', 'further_notice']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.OFF:
						commands.push(new Command('setDerogation', ['awayMode', 'further_notice']));
						break;
					
					default:
						callback("Bad command");
						break;
				}
        		break;
        	
        	default:
        		switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
					case Characteristic.TargetHeatingCoolingState.HEAT:
					case Characteristic.TargetHeatingCoolingState.COOL:
						 commands.push(new Command('setHeatingOnOffState', ['on']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.OFF:
						 commands.push(new Command('setHeatingOnOffState', ['off']));
						break;
					
					default:
						callback("Bad command");
						break;
				}
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
    
    /**
		* Triggered when Homekit try to modify the Characteristic.On
		**/
    setHeatingLevel: function(value, callback) {
        var that = this;
        
        var command = new Command('setHeatingLevel', [value ? 'comfort' : 'eco']);
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
		* Triggered when Homekit try to modify the Characteristic.On
		**/
    setOnOff: function(value, callback) {
        var that = this;
        
        var command = new Command('setOnOff', [value ? 'on' : 'off']);
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
    
    onStateUpdate: function(name, value) {
    	if(this.onState != null) {
			if (name == State.STATE_ON_OFF) {
				this.onState.updateValue(value == 'on' ? true : false);
			}
		} else {
        	if (name == 'core:TemperatureState') { // From merged TemperatureSensor
				var converted = value > 273.15 ? (value - 273.15) : value;
				this.currentState.updateValue(converted);
				
			} else if (name == 'core:RelativeHumidityState') { // From merged HumiditySensor
				var converted = value;
				if(this.currentHumidity != null) {
					this.currentHumidity.updateValue(converted);
				}
			} else if (name == 'core:TargetTemperatureState') {
				this.targetState.updateValue(value);
			} else if (name == 'somfythermostat:DerogationHeatingModeState') {
				this.activeMode = value;
				var converted = Characteristic.CurrentHeatingCoolingState.OFF;
				switch(value) {
					case'atHomeMode':
					case'geofencingMode':
					case'manualMode':
						converted = Characteristic.CurrentHeatingCoolingState.HEAT;
					break;
					case'sleepingMode':
					case'suddenDropMode':
						converted = Characteristic.CurrentHeatingCoolingState.COOL;
					break;
					case'awayMode':
					case'freezeMode':
					default:
						converted = Characteristic.CurrentHeatingCoolingState.OFF;
					break;
				}
				
				this.heatingCurrentState.updateValue(converted);
				
			} else if(this.heatingCurrentState != null && this.heatingTargetState != null) {
				var valueChange = false;
				if (name == State.STATE_ON_OFF || name == State.STATE_HEATING_ON_OFF) {
					this.onOff = value;
					valueChange = true;
				} else if (name == 'ovp:HeatingTemperatureInterfaceActiveModeState') {
					this.activeMode = value;
					valueChange = true;
				} else if (name == 'ovp:HeatingTemperatureInterfaceSetPointModeState') {
					this.setPointMode = value;
					valueChange = true;
				}
			
				if(valueChange) {
					var converted = Characteristic.CurrentHeatingCoolingState.OFF;
					var target = Characteristic.TargetHeatingCoolingState.OFF;
					
					if(this.onOff == 'on') {
						converted = this.setPointMode == 'comfort' ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;
						if(this.activeMode == 'auto') {
							target = Characteristic.TargetHeatingCoolingState.AUTO;
						} else {
							target = this.setPointMode == 'comfort' ? Characteristic.TargetHeatingCoolingState.HEAT : Characteristic.TargetHeatingCoolingState.COOL;
						}
					}
				
					this.heatingCurrentState.updateValue(converted);
					if (!this.isCommandInProgress())
						this.heatingTargetState.updateValue(target);
				}
			}
    	}
    }
}