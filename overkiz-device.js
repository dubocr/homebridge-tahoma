var Log;
var { State, Command, Execution, ExecutionState } = require('./overkiz-api');

class OverkizDevice {
    constructor(homebridge, log, api, device) {
    	Object.assign(this, device);
        this.services = [];
		this.child = [];
		this.parent = null;
		this.merged = false;
		this.timeout = null;
        
		Log = log;
		this.api = api;
		this.name = device.label;
        
        if(this.states == undefined) {
        	this.stateless = true;
        }
    }
    
    getAccessory(homebridge) {
		if(this.merged) {
			return null; // No accessory for merged subdevice
		}
    	var device = this;
    	
		var Service = homebridge.hap.Service;
		var Characteristic = homebridge.hap.Characteristic;
		var Accessory = homebridge.platformAccessory;
		var UUIDGen = homebridge.hap.uuid;
		
        var informationService = new Service.AccessoryInformation();
        informationService.setCharacteristic(Characteristic.Manufacturer, this.getManufacturer());
        informationService.setCharacteristic(Characteristic.Model, this.getModel());
        informationService.setCharacteristic(Characteristic.SerialNumber, this.getSerialNumber());
        
    	var hapAccessory = {};
    	hapAccessory.name = this.name;
    	hapAccessory.displayName = this.name;
    	hapAccessory.uuid_base = UUIDGen.generate(this.getSerialNumber());
    	hapAccessory.services = [informationService];
    	hapAccessory.getServices = function() {
    		var hapServices = [];
    		for(var service of device.services) {
    			hapServices.push(service.getHapService());
    		}
    		return this.services.concat(hapServices);
    	};
    	//inherits(HAPAccessory, Accessory);
    	return hapAccessory;
    }

    getName() {
        return this.label;
    }

    getSerialNumber() {
        return this.deviceURL;
    }
    
    getComponentID() {
        var i1 = this.deviceURL.indexOf("#");
        if(i1 != -1) {
        	return parseInt(this.deviceURL.substring(i1+1));
        }
        return 1;
	}

    getManufacturer() {
        var manufacturer = this._look_state(State.STATE_MANUFACTURER);
        if (manufacturer != null)
            return manufacturer;
        else
            return "Somfy";
    }

    getModel() {
        var manufacturer = this._look_state(State.STATE_MODEL);
        if (manufacturer != null)
            return manufacturer;
        else
            return this.uiClass;
    }
    
    onStatesUpdate(states) {
        if(states == null || this.states == undefined) return;

        for (var state of states) {
            this.states[state.name] = state.value;
        }

		for(var service of this.services) {
        	for (var state of states) {
            	service.onStateUpdate(state.name, state.value);
        	}
        }
    }
    
    getState(state, callback) {
        this.api.requestState(this.deviceURL, state, callback);
    }
    
    cancelCommand(callback) {
    	this.api.cancelCommand(this.lastExecId, callback);
    }
    
    executeCommand(commands, processing, callback) {
    	var cmdName = '';
		if(commands == null || commands.length == 0) {
			Log("No target command for " + this.name);
			processing(ExecutionState.FAILED);
			return;
		} else if(Array.isArray(commands)) {
			if(commands.length == 0) {
				Log("No target command for " + this.name);
				processing(ExecutionState.FAILED);
				return;
			} else if(commands.length > 1) {
				cmdName = commands[0].name + " +" + (commands.length-1) + " others";
			} else {
				cmdName = commands[0].name;
			}
			for(var c of commands) {
				Log('['+this.name+'] ' + c.name + JSON.stringify(c.parameters));
			}
		} else {
			Log('['+this.name+'] ' + commands.name +JSON.stringify(commands.parameters));
			cmdName = commands.name;
			commands = [commands];
		}
		
		if (this.isCommandInProgress()) {
			this.api.cancelCommand(this.lastExecId, function() {});
		}

		var command = {
			label: this.name + ' - ' + cmdName + ' - HomeKit',
			deviceURL: this.deviceURL,
			commands: commands,
			highPriority: this.states != undefined && this.states['io:PriorityLockLevelState'] != undefined
		};
		command.callback = function(status, error, data) {
			var deviceError = null;
			if(error && data && data.failedCommands) {
				if(data && data.failedCommands) {
					for(const fail of data.failedCommands) {
						if(fail.deviceURL == this.deviceURL) {
							deviceError = fail.failureType;
						}
					}
				} else {
					deviceError = error;
				}
            }
			
			if (status == ExecutionState.INITIALIZED) {
				this.lastExecId = data.execId;
			} else {
				if(status == ExecutionState.FAILED || status == ExecutionState.COMPLETED) {
					Log('[' + this.name + '] ' + cmdName + ' ' + (deviceError == null ? status : deviceError));
					try {
						callback(deviceError);
					} catch(err) {
						Log('Callback already triggered');
					}
				} else {
					Log.debug('[' + this.name + '] ' + cmdName + ' ' + (deviceError == null ? status : deviceError));
				}
			}

			processing(status, deviceError, data);
		}.bind(this);

		this.api.executeCommand(command);
    }

    /*
        Look for current state
    */
    _look_state(stateName) {
        if(this.states != null) {
            for (var state of this.states) {
                if (state.name == stateName)
                    return state.value;
            }
        }
        return null;
	}

    isCommandInProgress() {
        return (this.lastExecId in this.api.executionCallback);
    }
    
    postpone(todo, value, callback) {
        if(this.timeout != null) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(function() {
        	todo(value, function(err) {});
        }, 2000);
        callback();
    }

    hasCommand(name) {
        for(var command of this.definition.commands) {
            if(command.commandName == name)	{
                return true;
            }
        }
        return false;
    }
	
	attach(device) {
		var target = null;
		if(this.merge(device)) {
			target = this;
		} else {
			for(var child of this.child) {
				if(child.merge(device))
					target = child;
			}
		}
		
		if(target) {
			Log.info('#' + device.getComponentID() + ' ' + device.name + ' (' + device.widget + ') merged into #' + target.getComponentID() + ' ' + target.name + ' (' + target.widget + ')');
		} else {
			Log.info('#' + device.getComponentID() + ' ' + device.name + ' ('+device.widget+') attached to #' + this.getComponentID() + ' ' + this.name + ' ('+this.widget+')');
		}
	}
    
    merge(device) {
		device.parent = this;
		this.child.push(device);
		switch(device.widget + ' > ' + this.widget) {
			//case 'AtlanticPassAPCHeatingAndCoolingZone > AtlanticPassAPCZoneControl':
			case 'TemperatureSensor > AtlanticPassAPCHeatingAndCoolingZone':
			case 'TemperatureSensor > AtlanticPassAPCHeatingZone':
			case 'TemperatureSensor > AtlanticPassAPCDHW':
			case 'TemperatureSensor > SomfyThermostat':
			case 'RelativeHumiditySensor > SomfyThermostat':
			case 'TemperatureSensor > ValveHeatingTemperatureInterface':
			case 'TemperatureSensor > AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
				device.merged = true;
				device.services = this.services; // Relink device services to parent's one
				for(var service of this.services) {
					service.merge(device);
				}
			return true;

			case 'OccupancySensor > AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
			case 'ContactSensor > AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
			case 'CumulativeElectricPowerConsumptionSensor > AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
			case 'CumulativeElectricPowerConsumptionSensor > DomesticHotWaterProduction':
				device.merged = true;
				for(var service of device.services) {
					this.services.push(service);
				}
			return true;
			
			default:
			return false;
        }
    }
}

module.exports = OverkizDevice