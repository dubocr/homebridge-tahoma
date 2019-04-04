var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

var PowerConsumption, EnergyConsumption;

var inherits = function (ctor, superCtor) {

  if (ctor === undefined || ctor === null)
    throw new TypeError('The constructor to "inherits" must not be ' +
                        'null or undefined');

  if (superCtor === undefined || superCtor === null)
    throw new TypeError('The super constructor to "inherits" must not ' +
                        'be null or undefined');

  if (superCtor.prototype === undefined)
    throw new TypeError('The super constructor to "inherits" must ' +
                        'have a prototype');

  ctor.super_ = superCtor;
  Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

	makeCharacteristics();
	
    return HeatingSystem;
}

/**
 * Accessory "HeatingSystem"
 */
 
  // TODO : Not tested
HeatingSystem = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
	this.currentHumidity = null;
	this.temperature = config[this.name] || {};
	this.tempComfort = this.temperature.comfort || 19;
	this.tempEco = this.temperature.eco || 17;
	this.derogationDuration = this.derogationDuration || 3600;
	
	this.states = [];
	this.zones = [];
	
    if(this.device.widget == 'SomfyPilotWireElectricalHeater') {
    	var service = new Service.Switch(device.label);

		this.onState = service.getCharacteristic(Characteristic.On);
		this.onState.on('set', this.setHeatingLevel.bind(this));	
    } else if(this.device.widget == 'AtlanticPassAPCHeatPump' || this.device.widget == 'AtlanticPassAPCZoneControl') {
    	/*
    	this.currentState = service.getCharacteristic(Characteristic.CurrentTemperature);
		this.targetState = service.getCharacteristic(Characteristic.TargetTemperature)
		this.targetState.on('set', function(value, callback) { this.targetState.updateValue(0); callback(); }.bind(this));
		this.targetState.setProps({ minValue: 0, maxValue: 0 });
		this.targetState.updateValue(0);
		*/
		var service = new Service.Switch(device.label);
		this.onState = service.getCharacteristic(Characteristic.On);
   		this.onState.on('set', this.setOnOff.bind(this));
    } else {
		var service = new Service.Thermostat(device.label);
		this.currentState = service.getCharacteristic(Characteristic.CurrentTemperature);
		this.targetState = service.getCharacteristic(Characteristic.TargetTemperature)
		this.targetState.on('set', this.setTemperature.bind(this));
		
		this.heatingCurrentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
		this.heatingTargetState = service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
		this.heatingTargetState.on('set', this.setHeatingCooling.bind(this));
			
		if(this.device.widget == 'SomfyThermostat')
			this.targetState.setProps({ minValue: 15, maxValue: 26, minStep: 0.5 });
		else
			this.targetState.setProps({ minValue: 0, maxValue: 30, minStep: 0.5 });
    }
    
	//case 'AtlanticPassAPCHeatPump':
	//case 'AtlanticPassAPCZoneControl':
	this.service = service;
	this.services.push(service);
};

HeatingSystem.UUID = 'HeatingSystem';

HeatingSystem.prototype = {

	merge: function(device) {
		if(device.widget == 'AtlanticPassAPCHeatingAndCoolingZone') {
			return false; // Can't merge accessory, use it at standalone subaccesory
		}
		if(device.widget == 'TemperatureSensor' && this.zones != null && this.zones.length > 0) {
			var zone = this.findZone(device.deviceURL, 1);
			zone.merge(device);
		}
		if(this.energyState == null && device.uiClass == 'ElectricitySensor') {
			
		}
		return true;
    },
	
	addSubAccessory: function(subAccessory) {
        this.zones.push(subAccessory);
		this.log("Linking zone " + this.name + " > " + subAccessory.name + " with " + subAccessory.services.length + " services");
		//var service = new Service.Thermostat(device.label);
		//this.services.push(service);
		//this.services.concat(zone.services);
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
        	case 'HeatingSetPoint':
        		command = new Command('setTargetTemperature', [value]);
        		break;
				
			case 'SomfyThermostat':
					//command = new Command('setModeTemperature', [this.activeMode, value]);
					command = new Command('setDerogation', [value, 'further_notice']);
        		break;
				
			case 'AtlanticPassAPCHeatingAndCoolingZone':
				command = [];
				if(this.states['core:ThermalConfigurationState'] == 'heatingAndCooling') {
					command.push(new Command('setDerogatedTargetTemperature', [value]));
					command.push(new Command('setDerogationOnOffState', ['on']));
					command.push(new Command('setDerogationTime', [this.derogationDuration]));
				} else if(this.states['core:ThermalConfigurationState'] == 'heating') {
					if(['auto', 'externalScheduling', 'internalScheduling'].includes(this.states['io:PassAPCHeatingModeState'])) {
						command.push(new Command('setDerogatedTargetTemperature', [value]));
						command.push(new Command('setDerogationOnOffState', ['on']));
						command.push(new Command('setDerogationTime', [this.derogationDuration]));
					} else {
						if(this.states['io:PassAPCHeatingProfileState'] == 'comfort') {
							command.push(new Command('setComfortHeatingTargetTemperature', [value]));
						} else if(this.states['io:PassAPCHeatingProfileState'] == 'eco') {
							command.push(new Command('setEcoHeatingTargetTemperature', [value]));
						} else {
							this.log("Invalid state " + this.states['io:PassAPCHeatingProfileState']);
							callback("Invalid state");
						}
					}
				} else if(this.states['core:ThermalConfigurationState'] == 'cooling') {
					if(['auto', 'externalScheduling', 'internalScheduling'].includes(this.states['io:PassAPCCoolingModeState'])) {
						command.push(new Command('setDerogatedTargetTemperature', [value]));
						command.push(new Command('setDerogationOnOffState', ['on']));
						command.push(new Command('setDerogationTime', [this.derogationDuration]));
					} else {
						if(this.states['io:PassAPCCoolingProfileState'] == 'comfort') {
							command.push(new Command('setComfortCoolingTargetTemperature', [value]));
						} else if(this.states['io:PassAPCCoolingProfileState'] == 'eco') {
							command.push(new Command('setEcoCoolingTargetTemperature', [value]));
						} else {
							this.log("Invalid state " + this.states['io:PassAPCCoolingProfileState']);
							callback("Invalid state");
						}
					}
				}
			break;
        		
        	case 'AtlanticElectricalHeater':
        		if(value >= this.currentState.value)
        			command = new Command('setHeatingLevel', ['comfort']);
        		else
        			command = new Command('setHeatingLevel', ['eco']);
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
        	case 'HeatingSetPoint':
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
        		break;
        		
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
        		
        	case 'AtlanticElectricalHeater':
        		switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
						commands = new Command('setHeatingLevel', ['comfort']);
						break;
					
					case Characteristic.TargetHeatingCoolingState.HEAT:
						commands = new Command('setHeatingLevel', ['comfort']);
						break;
					
					case Characteristic.TargetHeatingCoolingState.COOL:
						commands = new Command('setHeatingLevel', ['eco']);
						break;
					
					case Characteristic.TargetHeatingCoolingState.OFF:
						commands = new Command('setHeatingLevel', ['off']);
						break;
					
					default:
						callback("Bad command");
						break;
				}
        		break;
				
			case 'AtlanticPassAPCHeatingAndCoolingZone':
        		switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
						commands.push(new Command('setHeatingOnOffState', ['on']));
						commands.push(new Command('setCoolingOnOffState', ['on']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.HEAT:
						commands.push(new Command('setHeatingOnOffState', ['on']));
						commands.push(new Command('setCoolingOnOffState', ['off']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.COOL:
						commands.push(new Command('setHeatingOnOffState', ['off']));
						commands.push(new Command('setCoolingOnOffState', ['on']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.OFF:
						commands.push(new Command('setHeatingOnOffState', ['off']));
						commands.push(new Command('setCoolingOnOffState', ['off']));
						break;
					
					default:
						callback("Bad command");
						break;
				}
        		break;
        	
        	case 'AtlanticPassAPCHeatPump':
			case 'AtlanticPassAPCZoneControl':
				switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
						commands.push(new Command('setPassAPCOperatingMode', ['heating']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.HEAT:
						commands.push(new Command('setPassAPCOperatingMode', ['heating']));
						break;
					
					case Characteristic.TargetHeatingCoolingState.COOL:
						commands.push(new Command('setPassAPCOperatingMode', ['cooling']));
						break;
						
					case Characteristic.TargetHeatingCoolingState.OFF:
						commands.push(new Command('setPassAPCOperatingMode', ['stop']));
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
        
        var command = null;
        
        if(this.device.widget == 'AtlanticPassAPCHeatPump' || this.device.widget == 'AtlanticPassAPCZoneControl') {
        	command = new Command('setPassAPCOperatingMode', [value ? 'heating' : 'stop']);
        } else {
        	command = new Command('setOnOff', [value ? 'on' : 'off']);
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
    
    findZone: function(url, sub) {
    	if(this.zones != null && this.zones.length > 0) {
			var i1 = url.indexOf("#");
			if(i1 != -1) {
				var subid = parseInt(url.substring(i1+1)) - sub;
				for (z of this.zones) {
					if(z.device.deviceURL == url || z.device.deviceURL.endsWith("#"+subid)) {
						return z;
					}
				}
			}
		}
		return null;
    },
    
    onStateUpdate: function(name, value, deviceURL) {
    	var zone = this.findZone(deviceURL, 1) || this;
    	if(zone.onState != null) {
			if (name == State.STATE_ON_OFF) {
				zone.onState.updateValue(value == 'on' ? true : false);
			} else if (name == 'io:PassAPCOperatingModeState') {
				zone.onState.updateValue(value != 'stop');
			} 
		} else {
        	if (name == 'core:ElectricEnergyConsumptionState') {
        		converted = value / 1000;
        		if(zone.energyState) {
            		zone.energyState.updateValue(converted);
            	}
        	} else if (name == 'core:TemperatureState') { // From merged TemperatureSensor
				var converted = value > 273.15 ? (value - 273.15) : value;
				zone.currentState.updateValue(converted);
			} else if (name == 'core:RelativeHumidityState') { // From merged HumiditySensor
				var converted = value;
				if(zone.currentHumidity != null) {
					zone.currentHumidity.updateValue(converted);
				}
			} else if (name == 'core:TargetTemperatureState') {
				zone.targetState.updateValue(value);
			} else if(zone.heatingCurrentState != null && zone.heatingTargetState != null) {
				if(zone.device.widget.startsWith('AtlanticPassAPC')) {
					// PASS APC
					zone.states[name] = value;
					//this.log(name + "=>" + value);
					if (name == 'core:HeatingOnOffState' ||
						name == 'core:CoolingOnOffState' ||
						name == 'core:ThermalConfigurationState') {
						var converted = Characteristic.CurrentHeatingCoolingState.OFF;
						var target = Characteristic.TargetHeatingCoolingState.OFF;
						if(zone.states['core:HeatingOnOffState'] == 'on') {
							converted = Characteristic.CurrentHeatingCoolingState.HEAT;
						} else if(zone.states['core:CoolingOnOffState'] == 'on') {
							converted = Characteristic.CurrentHeatingCoolingState.COOL;
						}
					
						if(zone.states['core:HeatingOnOffState'] == 'on' || zone.states['core:CoolingOnOffState'] == 'on') {
							switch(zone.states['core:ThermalConfigurationState']) {
								case 'heating':
									target = Characteristic.TargetHeatingCoolingState.HEAT;
								break;
								case 'cooling':
									target = Characteristic.TargetHeatingCoolingState.COOL;
								break;
								default:
								case 'heatingAndCooling':
									target = Characteristic.TargetHeatingCoolingState.AUTO;
								break;
							}
						}
				
						zone.heatingCurrentState.updateValue(converted);
						if (!zone.isCommandInProgress())
							zone.heatingTargetState.updateValue(target);
					}
					return;
				}
				var valueChange = false;
				if (name == State.STATE_ON_OFF || name == State.STATE_HEATING_ON_OFF) {
					zone.onOff = value;
					valueChange = true;
				} else if (name == 'ovp:HeatingTemperatureInterfaceActiveModeState') {
					zone.activeMode = value;
					valueChange = true;
				} else if (name == 'ovp:HeatingTemperatureInterfaceSetPointModeState') {
					zone.setPointMode = value;
					valueChange = true;
				} else if (name == 'core:DerogationActivationState') { // SomfyThermostat
					zone.activeMode = value == 'inactive' ? 'auto' : 'manual';
					valueChange = true;
				} else if (name == 'somfythermostat:DerogationHeatingModeState') { // SomfyThermostat
					switch(value) {
						case'atHomeMode':
						case'geofencingMode':
						case'manualMode':
							zone.onOff = 'on';
							zone.setPointMode = 'comfort';
						break;
						case'sleepingMode':
						case'suddenDropMode':
							zone.onOff = 'on';
							zone.setPointMode = 'eco';
						break;
						case'awayMode':
						case'freezeMode':
						default:
							zone.onOff = 'off';
						break;
					}
					valueChange = true;
				} else if (name == 'io:TargetHeatingLevelState') { // AtlanticHeatingInterface
					zone.setPointMode = value;
					zone.activeMode = null;
					switch(value) {
						case 'boost':
						case 'comfort':
						case 'comfort-1':
						case 'comfort-2':
							zone.targetState.updateValue(zone.tempComfort);
							zone.currentState.updateValue(zone.tempComfort);
						break;
						case 'eco':
							zone.targetState.updateValue(zone.tempEco);
							zone.currentState.updateValue(zone.tempEco);
						break;
						case 'frostprotection':
							zone.targetState.updateValue(7);
							zone.currentState.updateValue(7);
						break;
						default:
							zone.targetState.updateValue(0);
							zone.currentState.updateValue(0);
						break;
					}
					valueChange = true;
				}
				
				if(valueChange) {
					var converted = Characteristic.CurrentHeatingCoolingState.OFF;
					var target = Characteristic.TargetHeatingCoolingState.OFF;
					
					if(zone.onOff == 'on') {
						converted = zone.setPointMode == 'comfort' ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;
						if(zone.activeMode == 'auto') {
							target = Characteristic.TargetHeatingCoolingState.AUTO;
						} else {
							target = zone.setPointMode == 'comfort' ? Characteristic.TargetHeatingCoolingState.HEAT : Characteristic.TargetHeatingCoolingState.COOL;
						}
					}
				
					zone.heatingCurrentState.updateValue(converted);
					if (!zone.isCommandInProgress())
						zone.heatingTargetState.updateValue(target);
					return;
				}
			}
    	}
    }
}

function makeCharacteristics() {
	PowerConsumption = function() {
    Characteristic.call(this, 'Current Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.INT,
      maxValue: 65535,
      minValue: 0,
      minStep: 1,
      unit: "W",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  inherits(PowerConsumption, Characteristic);
  
  EnergyConsumption = function() {
    Characteristic.call(this, 'Total Consumption', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.FLOAT,
      maxValue: 4294967295,
      minValue: 0,
      minStep: 0.01,
      unit: "kWh",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  inherits(EnergyConsumption, Characteristic);
}