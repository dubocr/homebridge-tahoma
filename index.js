var Accessory, Service, Characteristic, UUIDGen, Types;

var request = require("request").defaults({ jar: true })
var pollingtoevent = require('polling-to-event');
var execution = {
	INIT: 0,
	START: 1,
	END: 2
};

/*
	Overkiz states
*/
const STATE_CLOSURE = "core:ClosureState";
const STATE_OPEN_CLOSED = "core:OpenClosedState";
const STATE_LOCKED_UNLOCKED = "core:LockedUnlockedState";
const STATE_PRIORITY_LOCK = "core:PriorityLockLevelState";
const STATE_ACTIVE_ZONES = "core:ActiveZonesState";
const STATE_TARGET_TEMP = "core:TargetTemperatureState";
const STATE_HEATING_ON_OFF = "core:HeatingOnOffState";

module.exports = function(homebridge) {
    console.log("homebridge-overkiz API version: " + homebridge.version);

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    Types = homebridge.hapLegacyTypes;

    // For platform plugin to be considered as dynamic platform plugin,
    // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
    homebridge.registerPlatform("homebridge-overkiz", "Overkiz", OverkizPlatform, false);
}

function OverkizPlatform(log, config, api) {
    log("Overkiz Init");
    this.log = log;
    this.user = config['user'];
    this.password = config['password'];
    switch(config['service']) {
    	case "Cozytouch":
    		this.server = "ha110-1.overkiz.com";
    	break;
    	case "TaHoma":
    	default:
    		this.server = "tahomalink.com";
    	break;    
    }
    this.isLoggedIn = false;

    var that = this;
    var statusemitter = pollingtoevent(function(done) {
    	that.put({
            url: that.urlForQuery("/setup/devices/states/refresh"),
            json: true
        }, function(json) {
            done(null, json);
        });
	}, {longpolling:true,interval:(1000*60*60)});
}

OverkizPlatform.prototype = {
    urlForQuery: function(query) {
        return "https://" + this.server + "/enduser-mobile-web/enduserAPI" + query;
    },

    post: function(options, callback) {
        var fct = request.post.bind(request, options);
        this.requestWithLogin(fct, callback);
    },

    get: function(options, callback) {
        var fct = request.get.bind(request, options);
        this.requestWithLogin(fct, callback);
    },

    put: function(options, callback) {
        var fct = request.put.bind(request, options);
        this.requestWithLogin(fct, callback);
    },
    
    delete: function(options, callback) {
        var fct = request.delete.bind(request, options);
        this.requestWithLogin(fct, callback);
    },

    requestWithLogin: function(myRequest, callback) {
        var that = this;
        var authCallback = function(err, response, json) {
            if (response != undefined && response.statusCode == 401) { // Reauthenticated
                that.isLoggedIn = false;
                that.log(json.error);
                that.requestWithLogin(myRequest, callback);
            } else if (err) {
                that.log("There was a problem requesting to Overkiz : " + err);
                callback("There was a problem requesting to Overkiz : " + err);
            } else if (response != undefined && (response.statusCode < 200 || response.statusCode >= 300)) {
            	that.log(json.errorCode + " (" + response.statusCode + ") : " + json.error);
                that.log(json);
                callback(json.errorCode + " (" + response.statusCode + ") : " + json.error);
            } else {
                callback(null, json);
            }
        };
        if (this.isLoggedIn) {
            myRequest(authCallback);
        } else {
            this.log("Log in Overkiz server...");
            var that = this;
            request.post({
                url: this.urlForQuery("/login"),
                form: {
                    'userId': this.user,
                    'userPassword': this.password
                },
                json: true
            }, function(err, response, json) {
            	if(err) {
            		that.log("Unable to login: " + err);
            	} else if (json.success) {
                    that.isLoggedIn = true;
                    myRequest(authCallback);
                } else if (json.error) {
                    that.log("Loggin fail: " + json.error);
                } else {
                    that.log("Unable to login");
                }
            });
        }
    },

    accessories: function(callback) {
        var that = this;
        this.log("Fetching Overkiz accessories...");
        this.get({
            url: that.urlForQuery("/setup"),
            json: true
        }, function(error, json) {
            var foundAccessories = [];
            for (device of json.devices) {
                if (device.uiClass == 'Pod') continue; // Skip box
                accessory = new OverkizAccessory(that.log, that, device);
                foundAccessories.push(accessory);
            }
            callback(foundAccessories);
        });
    },
    
    // TODO: Complete with Pod information
    getInformationService: function(homebridgeAccessory) {
		var informationService = new Service.AccessoryInformation();
		informationService
					.setCharacteristic(Characteristic.Manufacturer, "Overkiz")
					.setCharacteristic(Characteristic.Model, "Pod")
					.setCharacteristic(Characteristic.SerialNumber, "0000-0000-0000");
		return informationService;
  }
}

function OverkizAccessory(log, platform, device) {
    // device info
    //this.states = [];
    //this.targetStates = [];
    this.log = platform.log;
    this.platform = platform;

    this.name = device.label;
    this.deviceURL = device.deviceURL;
    this.device = device;
}

OverkizAccessory.prototype = {		
	getServices: function() {
        // you can OPTIONALLY create an information service if you wish to override
        // the default values for things like serial number, model, etc.
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Overkiz")
            .setCharacteristic(Characteristic.Model, this.device.uiClass)
            .setCharacteristic(Characteristic.SerialNumber, this.device.deviceURL);
    
    	var currentState = null;
		switch (this.device.uiClass) {
            case "RollerShutter":
            	currentState = this.getHomekitStateCharacteristic(STATE_CLOSURE, this._look_state(STATE_CLOSURE)).value;
    			this.service = new Service.WindowCovering(this.device.label);
                this.service.getCharacteristic(Characteristic.CurrentPosition)
                    .on('get', this.getState.bind(this, STATE_CLOSURE))
                    .updateValue(currentState);
                this.service.getCharacteristic(Characteristic.TargetPosition)
                    .on('set', this.setTarget.bind(this, STATE_CLOSURE))
                    .value = currentState;
                this.service.getCharacteristic(Characteristic.PositionState)
                    .on('get', this.getCommandStatus.bind(this, STATE_CLOSURE));
            break;
            case "DoorLock":
    			currentState = this.getHomekitStateCharacteristic(STATE_LOCKED_UNLOCKED, this._look_state(STATE_LOCKED_UNLOCKED)).value;
    			this.service = new Service.LockMechanism(this.device.label);
                this.service.getCharacteristic(Characteristic.LockCurrentState)
                    .on('get', this.getState.bind(this, STATE_LOCKED_UNLOCKED))
                    .updateValue(currentState);
                this.service.getCharacteristic(Characteristic.LocktargetStates)
                    .on('set', this.setTarget.bind(this, STATE_LOCKED_UNLOCKED))
                    .value = currentState;;
            break;
            case "Gate":
            	currentState = this.getHomekitStateCharacteristic(STATE_CLOSURE, this._look_state(STATE_CLOSURE)).value;
    			this.service = new Service.Door(this.device.label);
                this.service.getCharacteristic(Characteristic.CurrentPosition)
                    .on('get', this.getState.bind(this, STATE_CLOSURE))
                    .updateValue(currentState);
                this.service.getCharacteristic(Characteristic.TargetPosition)
                    .on('set', this.setTarget.bind(this, STATE_CLOSURE))
                    .value = currentState;;
                this.service.getCharacteristic(Characteristic.PositionState)
                    .on('get', this.getState.bind(this, STATE_OPEN_CLOSED));
            break;
            case "Alarm":
            	currentState = this.getHomekitStateCharacteristic(STATE_ACTIVE_ZONES, this._look_state(STATE_ACTIVE_ZONES)).value;
    			this.service = new Service.SecuritySystem(this.device.label);
                this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState)
                    .on('get', this.getState.bind(this, STATE_ACTIVE_ZONES))
                    .updateValue(currentState);
                this.service.getCharacteristic(Characteristic.SecuritySystemtargetStates)
                    .on('set', this.setTarget.bind(this, STATE_ACTIVE_ZONES))
                    .value = currentState;;
            break;
            case "HeatingSystem":
            	currentState = this.getHomekitStateCharacteristic(STATE_TARGET_TEMP, this._look_state(STATE_TARGET_TEMP)).value;
    			var currentState2 = this.getHomekitStateCharacteristic(STATE_HEATING_ON_OFF, this._look_state(STATE_HEATING_ON_OFF)).value;
    			this.service = new Service.Thermostat(this.device.label);
                this.service.getCharacteristic(Characteristic.CurrentTemperature)
                    .on('get', this.getState.bind(this, STATE_TARGET_TEMP))
                    .updateValue(currentState);
                this.service.getCharacteristic(Characteristic.TargetTemperature)
                    .on('set', this.setTarget.bind(this, STATE_TARGET_TEMP))
                    .value = currentState;
                this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                    .on('get', this.getState.bind(this, STATE_HEATING_ON_OFF))
                    .updateValue(currentState2);
                this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
                    .on('set', this.setTarget.bind(this, STATE_HEATING_ON_OFF))
                    .value = currentState;;
            break;
            default:
            	var STATE = "OnOff";
            	currentState = this.getHomekitStateCharacteristic(STATE, this._look_state(STATE)).value;
            	this.service = new Service.Switch(this.device.label);
                /*this.service.getCharacteristic(Characteristic.On)
                    .on('set', this.setState.bind(this, STATE))
                    .on('get', this.getState.bind(this, STATE));*/
            break;
        }

		return [informationService, this.service];
    },
    
    /* Generic commands */
	
	identify: function(callback) {
		executeCommand({ type:1, name: 'identify', parameters: [] }, callback, function() {});
	},
	
    /*
		Refresh component state
		Return state in cache
	*/
	getState: function(name, callback) {
		var that = this;
        this.requestState(name, function(error, value) {
        	if(error) {
        		that.log(error);
        		callback(error);
        	} else {
        		c = that.getHomekitStateCharacteristic(name, value);
            	callback(null, c.value);
            	that.log('['+that.name+'] ' + name + "=" + c.value);
            }
        });
	},
	
	/*
		Provide information about the command in progress
		Return state in cache
	*/
	getCommandStatus: function(name, callback) {
		var characteristic = that.getHomekitCommandCharacteristic(name, this.currentCommand);
        this.log('Get ' + name + ' command status => ' + characteristic.value);
		callback(null, characteristic.value);
	},
	
	/*
		Modify the target for the 'name' state and execute the corresponding command
		name: The state name
		value: The new value of the state
		callback: HomeKit callback
	*/
	setTarget: function(name, value, callback) {
		var that = this;
		
		// Obtain the Overkiz corresponding command for this state and this new value
		var command = this.getOverkizCommand(name, value);

		that.log('['+that.name+'] ' + "Set " + name + " to " + value + " => " + command.name + "(" + command.parameters + ")");
		this.executeCommand(command, function(status, err) {
			switch(status) {
				case execution.INIT:
					callback(err);
				break;
				case execution.START:
					// Command started callback
					if(err == null) {
						// Update command status characteristic
						var commandCharac = that.getHomekitCommandCharacteristic(name, command);
						if(commandCharac.name != null) {
							var name2 = that.service.getCharacteristic(commandCharac.name).updateValue(commandCharac.value).displayName;
							that.log('['+that.name+'] ' + command.name + ' in progress (' + name2 + '=' + commandCharac.value + ')');
						} else 
							that.log(commandCharac + ' --- ' + name);
					} else 
						that.log(err);
				break;
				case execution.END:
					// Command executed callback
					// Update command state characteristic
					var commandCharac = that.getHomekitCommandCharacteristic(name, command);
					if(commandCharac.name != null)
						that.service.getCharacteristic(commandCharac.name).updateValue(commandCharac.value);
			
					// Update state characteristic
					that.requestState(name, function(error, value) {
						var characteristic = that.getHomekitStateCharacteristic(name,value);
						that.service.getCharacteristic(characteristic.name).updateValue(characteristic.value);
						var targetcharac = that.getHomekitTargetCharacteristic(name);
						that.service.getCharacteristic(targetcharac).updateValue(characteristic.value);
						that.log('['+that.name+'] ' + command.name + ' ' + (err == null ? 'OK' : err) + ' (' + name + '=' + characteristic.value + ')');
					});
				break;
				default:
					that.log("Bad execution state %s", status);
				break;
			}
		});
	},
    
    /*
    	Return a converted state for Homekit
    	'name': Overkiz name of the state to convert
    	'value': Current value of the state
    */
    getHomekitStateCharacteristic: function(name, value) {
    	switch(name) {
			case STATE_CLOSURE:
				return { name: Characteristic.CurrentPosition, value: 100-value };
			break;
			case STATE_LOCKED_UNLOCKED:
				switch(value) {
					case "locked": return { name: Characteristic.LockCurrentState, value: Characteristic.LockCurrentState.SECURED };
					case "unlocked": return { name: Characteristic.LockCurrentState, value: Characteristic.LockCurrentState.UNSECURED };
					default: return { name: Characteristic.LockCurrentState, value: Characteristic.LockCurrentState.UNSECURED };//UNKNOWN
				}
			break;
			case STATE_ACTIVE_ZONES:
				switch(value) {
					case "": return { name: Characteristic.SecuritySystemCurrentState, value: Characteristic.SecuritySystemCurrentState.DISARMED };
					default: return { name: Characteristic.SecuritySystemCurrentState, value: Characteristic.SecuritySystemCurrentState.AWAY_ARM };
				}
			break;
			case STATE_TARGET_TEMP:
				return { name: Characteristic.CurrentTemperature, value: value };
			break;
			case STATE_HEATING_ON_OFF:
				return { name: Characteristic.CurrentHeatingCoolingState, value: value == 'off' ? Characteristic.CurrentHeatingCoolingState.OFF : Characteristic.CurrentHeatingCoolingState.HEAT };
			break;
			default:
				return { name: null, value: value };
			break;
		}
    },
    
    getHomekitTargetCharacteristic: function(name) {
    	switch(name) {
			case STATE_CLOSURE:
				return Characteristic.TargetPosition;
			break;
		}
    },
    
    /*
    	Return a converted state for Homekit current command
    	'name': Overkiz name of the state to convert
    	'value': Current value of the state
    */
    getHomekitCommandCharacteristic: function(name, command) {
    	switch(name) {
			case STATE_CLOSURE:
				var state = this.service.getCharacteristic(this.getHomekitStateCharacteristic(name, 0).name).value;
				var target = this.service.getCharacteristic(this.getHomekitTargetCharacteristic(name)).value;
				if(this.currentCommand == null) // Not running
					return { name: Characteristic.PositionState, value: Characteristic.PositionState.STOPPED };
				else if(target == 100 || target > state)
					return { name: Characteristic.PositionState, value: Characteristic.PositionState.INCREASING };
				else
					return { name: Characteristic.PositionState, value: Characteristic.PositionState.DECREASING };
			break;
			default:
				return { name: null, value: null };
			break;
		}
    },
    
    /*
    	Return an associated command and optional params to modify this state
    	'name': Overkiz name of the state to update
    	'value': Target value
    */
    getOverkizCommand: function(name, value) {
    	var command = { type: 1, name: null, parameters: [] };
    	switch(name) {
			case STATE_CLOSURE:
				command.name = 'setPosition';
				command.parameters = [100-value];
			break;
			case STATE_OPEN_CLOSED:
				command.name = value ? 'open' : 'close';
			break;
			case STATE_LOCKED_UNLOCKED:
				switch(value) {
					case Characteristic.LockCurrentState.SECURED: command.name = 'lock'; break;
					case Characteristic.LockCurrentState.UNSECURED:
					case Characteristic.LockCurrentState.JAMMED:
					case Characteristic.LockCurrentState.UNKNOWN: 
					default: command.name = 'unlock';
					break;
				}
			break;
			case STATE_ACTIVE_ZONES:
				switch(value) {
					case Characteristic.SecuritySystemCurrentState.STAY_ARM:
					case Characteristic.SecuritySystemCurrentState.AWAY_ARM:
					case Characteristic.SecuritySystemCurrentState.NIGHT_ARM:
						 command.name = 'alarmOn';
					break;
					case Characteristic.SecuritySystemCurrentState.DISARMED:
						 command.name = 'alarmOff';
					break;
				}
			break;
			case STATE_TARGET_TEMP:
				command.name = 'setHeatingTargetTemperature';
				command.parameters = [value];
			break;
			case STATE_HEATING_ON_OFF:
				command.name = 'setHeatingOnOffState';
				switch(value) {
					case Characteristic.CurrentHeatingCoolingState.HEAT:
					case Characteristic.CurrentHeatingCoolingState.COOL:
						 command.parameters = ['on'];
					break;
					case Characteristic.CurrentHeatingCoolingState.OFF:
					default:
						 command.parameters = ['off'];
					break;
				}
			break;
			
			default:
				command.name = 'set'+name;
			break;
		}
		return command;
    },
	
	/* Overkiz helpers */
	
    requestState: function(state, callback) {
        var that = this;
        this.platform.get({
            url: this.platform.urlForQuery("/setup/devices/" + encodeURIComponent(this.deviceURL) + "/states/" + encodeURIComponent(state)),
            json: true
        }, function(error, json) {
            //that.log(json);
            callback(error, json.value);
        });
    },
    
    cancelCommand: function(execId, callback) {
        var that = this;
        this.platform.delete({
            url: this.platform.urlForQuery("/exec/current/setup/" + execId),
            json: true
        }, function(error, json) {
            callback();
        });
    },

	/*
		cmdName: The command to execute
		params: Parameter of the command
		callback: Callback function executed when command sended
		refresh: Callback function executed when command succeed
	*/
    executeCommand: function(command, callback) {
        var that = this;
        if(this.currentCommand != null) {
			this.cancelCommand(this.currentCommand.id, function() {
				that.currentCommand.execpoll.pause();
				that.currentCommand = null;
				that.executeCommand(command, callback);
			});
			return;
		}
		this.currentCommand = command;
        this.platform.post({
            url: that.platform.urlForQuery("/exec/apply"),
            body: {
                label: "Execution Homekit",
                metadata: null,
                actions: [{
                    deviceURL: this.deviceURL,
                    commands: [this.currentCommand]
                }]
            },
            json: true
        }, function(error, json) {
        	if(error == null) {
        		callback(execution.INIT, null); // Init OK
        		var execId = json.execId;
        		if(that.currentCommand != null)
					that.currentCommand.id = execId;
				
				var execpoll = pollingtoevent(function(done) {
					that.platform.get({
						url: that.platform.urlForQuery("/exec/current/"+execId),
						json: true
					}, function(error, json) {
						done(error, json);
					});
				}, {longpolling:true,interval:500});
				
				if(that.currentCommand != null)
					that.currentCommand.execpoll = execpoll;
	
				execpoll.on("longpoll", function(data) {
					//that.log(data);
					if(data.state == undefined) { // Execution ended
						this.pause(); // Stop pooling execution state
						that.currentCommand = null;
						that.platform.get({
							url: that.platform.urlForQuery("/history/executions/"+execId),
							json: true
						}, function(error, json) {
							if(json.execution != undefined) {
								//that.log("Execution %s (%s)", json.execution.state, json.execution.failureType);
								callback(execution.END, json.execution.failureType == 'NO_FAILURE' ? null : json.execution.failureType);
							} else {
								callback(execution.END, new Error("Unknown error"));
							}
						});
					} else {
						if(that.currentCommand != null)
							that.currentCommand.state = data.state;
						//that.log("Execution %s", data.state);
						if(data.state == "IN_PROGRESS") {
							callback(execution.START, null);
						}
					}
				});
			
				execpoll.on("error", function(err, data) {
					that.log("Execution error %s %s", err, data);
					this.pause();
					callback(execution.INIT, err);
				});
			
			} else {
				callback(execution.INIT, error);
			}
        });
    },
    
    /*
    	Look for current state
    */
	_look_state: function(stateName) {
		for(state of this.device.states) {
			if(state.name == stateName)
				return state.value;
		}
		return null;
	}
};