var Log;
var { State, Command, Execution, ExecutionState } = require('./overkiz-api');

class OverkizDevice {
    constructor(homebridge, log, api, device) {
    	Object.assign(this, device);
        this.services = [];
		this.child = [];
		this.merged = false;
        
		Log = log;
		this.api = api;
        this.name = device.label;
        
        if(this.states == undefined) {
        	this.stateless = true;
        }
    }
    
    getAccessory(homebridge) {
		if(this.merged) {
			return null; // No accessory for subdevice
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
        if(states == null) return;

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
    
    executeCommand(commands, callback) {
            var cmdName = '';
            if(commands == null || commands.length == 0) {
                Log("No target command for " + this.name);
                callback("No target command for " + this.name);
				return;
            } else if(Array.isArray(commands)) {
            	if(commands.length == 0) {
                    Log("No target command for " + this.name);
                    callback("No target command for " + this.name);
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
    
            var label = this.name + ' - ' + cmdName + ' - HomeKit';
            var execution = new Execution(label, this.deviceURL, commands);
            
            this.api.executeCommand(execution, function(status, error, data) {
            	if (status == ExecutionState.INITIALIZED) {
                    if(error) {
                    	// API Error
                    	this.updateReachability(false);
                	} else {
                		this.lastExecId = data.execId;
                    }
                }
                
                if(status == ExecutionState.FAILED || status == ExecutionState.COMPLETED)
                    Log('[' + this.name + '] ' + cmdName + ' ' + (error == null ? status : error));
                else
                    Log.debug('[' + this.name + '] ' + cmdName + ' ' + (error == null ? status : error));

                callback(status, error, data);
            }.bind(this));
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
        	todo(value, function(err) { });
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
		for(var child of this.child) {
			if(child.merge(device))
				target = child;
		}
		if(target != null)
			Log(device.name + ' (' + device.widget + ') merged into ' + target.name + ' (' + target.widget + ')');
		device.parent = this;
		this.child.push(device);
	}
    
    merge(device) {
		switch(device.widget + ' > ' + this.widget) {
			case 'AtlanticPassAPCHeatingAndCoolingZone > AtlanticPassAPCZoneControl':
			case 'TemperatureSensor > AtlanticPassAPCHeatingAndCoolingZone':
			case 'TemperatureSensor > AtlanticPassAPCDHW':
				device.services = this.services;
				device.merged = true;
				device.parent = this;
				this.child.push(device);
			return true;
			
			default:
			return false;
        }
    }
}

module.exports = OverkizDevice