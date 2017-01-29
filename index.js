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
const STATE_OPEN_CLOSED_PEDESTRIAN = "core:OpenClosedPedestrianState";
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

function OverkizCommand(name) {
	this.type = 1;
	this.name = name;
	this.parameters = [];
}

function OverkizState(name) {
	this.name = name;
	this.characteristics = { main: null, target: null, status: null };
}

OverkizState.prototype = {
	convert: function(value) { return value; },
	getCommand: function(value) { return null; },
	getStatus: function(running) { return null; }
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
    
    	switch (this.device.uiClass) {
            case "RollerShutter":
            	this.service = new Service.WindowCovering(this.device.label);
            break;
            case "DoorLock": // Portail
    			this.service = new Service.LockMechanism(this.device.label);
            break;
            case "Gate": // Portail
            	this.service = new Service.GarageDoorOpener(this.device.label);
            break;
            case "GarageDoor": // Porte Garage
            	this.service = new Service.GarageDoorOpener(this.device.label);
            break;
            case "Alarm":
            	this.service = new Service.SecuritySystem(this.device.label);
            break;
            case "HeatingSystem":
            	this.service = new Service.Thermostat(this.device.label);
            break;
            default:
            	this.service = new Service.Switch(this.device.label);
            break;
        }
        
        var accessory = this;
        for(state of this.device.states) {
        	var overkizState = new OverkizState(state.name);
			switch(state.name) {
				case STATE_CLOSURE:
					if(this.service.UUID == Service.WindowCovering.UUID) {
						overkizState.characteristics.main = this.service.getCharacteristic(Characteristic.CurrentPosition);
						overkizState.characteristics.target = this.service.getCharacteristic(Characteristic.TargetPosition);
						overkizState.characteristics.status = this.service.getCharacteristic(Characteristic.PositionState);
						overkizState.convert = function(value) { return 100-value; };
						overkizState.getCommand = function(value) {
							var command = new OverkizCommand('setPosition');
							command.parameters = [100-value];
							return command;
						};
						overkizState.getStatus = function(running) {
							if(!running) // Not running
								return Characteristic.PositionState.STOPPED;
							else if(this.characteristics.target.value == 100 || this.characteristics.target.value > this.characteristics.main.value)
								return Characteristic.PositionState.INCREASING;
							else
								return Characteristic.PositionState.DECREASING;
						};
					}
				break;
				case 'core:OpenClosedUnknownState':
					overkizState.characteristics.main = this.service.getCharacteristic(Characteristic.CurrentDoorState);
					overkizState.characteristics.target = this.service.getCharacteristic(Characteristic.TargetDoorState);
					overkizState.convert = function(value) {
						switch(value) {
							case 'unknown':
							case 'open' : return Characteristic.CurrentDoorState.OPEN; break;
							case 'closed' : return Characteristic.CurrentDoorState.CLOSED; break;
						}
					};
					overkizState.getCommand = function(value) {
						return new OverkizCommand(value == Characteristic.TargetDoorState.OPEN ? 'open' : 'close');
					};
				break;
				case STATE_OPEN_CLOSED_PEDESTRIAN:
					overkizState.characteristics.main = this.service.getCharacteristic(Characteristic.CurrentDoorState);
					overkizState.characteristics.target = this.service.getCharacteristic(Characteristic.TargetDoorState);
					overkizState.convert = function(value) {
						switch(value) {
							case 'unknown':
							case 'open' : return Characteristic.CurrentDoorState.OPEN; break;
							case 'pedestrian' : return Characteristic.CurrentDoorState.STOPPED; break;
							case 'closed' : return Characteristic.CurrentDoorState.CLOSED; break;
						}
					};
					overkizState.getCommand = function(value) {
						return new OverkizCommand(value == Characteristic.TargetDoorState.OPEN ? 'open' : 'close');
					};
				break;
				case STATE_LOCKED_UNLOCKED:
					overkizState.characteristics.main = this.service.getCharacteristic(Characteristic.LockCurrentState);
					overkizState.characteristics.target = this.service.getCharacteristic(Characteristic.LockTargetState);
					overkizState.convert = function(value) { return value == 'locked' ? Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED; };
					overkizState.getCommand = function(value) {
						var command = new OverkizCommand(value == Characteristic.LockTargetState.SECURED ? 'lock' : 'unlock');
						return command;
					};
				break;
				case STATE_ACTIVE_ZONES:
					overkizState.characteristics.main = this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState);
					overkizState.characteristics.target = this.service.getCharacteristic(Characteristic.SecuritySystemTargetState);
					overkizState.convert = function(value) {
						switch(value) {
							default:
							case '': return Characteristic.SecuritySystemCurrentState.DISARMED;
							case 'A,B': return Characteristic.SecuritySystemCurrentState.STAY_ARM;
							case 'A,B,C': return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
							case 'A': return Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
							case 'triggered': return Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
						}
					};
					overkizState.getCommand = function(value) {
						var commandName = null;
						switch(value) {
							default:
							case Characteristic.SecuritySystemTargetState.STAY_ARM:
							case Characteristic.SecuritySystemTargetState.AWAY_ARM:
							case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
								 commandName = 'alarmOn';
							break;
							case Characteristic.SecuritySystemTargetState.DISARM:
								 commandName = 'alarmOff';
							break;
						}
						return commandName != null ? new OverkizCommand(commandName): null;
					};
				break;
				case STATE_HEATING_ON_OFF:
					overkizState.characteristics.main = this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
					overkizState.characteristics.target = this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState);
					overkizState.convert = function(value) { return value == 'off' ? Characteristic.CurrentHeatingCoolingState.OFF : Characteristic.CurrentHeatingCoolingState.HEAT; };
					overkizState.getCommand = function(value) {
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
						return command;
					};
				break;
				case STATE_TARGET_TEMP:
					overkizState.characteristics.main = this.service.getCharacteristic(Characteristic.CurrentTemperature);
					overkizState.characteristics.target = this.service.getCharacteristic(Characteristic.TargetTemperature);
					overkizState.getCommand = function(value) {
						var command = new OverkizCommand('setHeatingTargetTemperature');
						command.parameters = [value];
						return command;
					};
				break;
				case STATE_OPEN_CLOSED:
					overkizState.getCommand = function(value) {
						return new OverkizCommand(value ? 'open' : 'close');
					};
				break;
				default:
				break;
			}
					
			/* Configure HAP */
			if(overkizState.characteristics.main != null) {
				overkizState.characteristics.main
					.on('get', accessory.getState.bind(accessory, overkizState))
					.updateValue(overkizState.convert(state.value));
			}
			if(overkizState.characteristics.target != null) {
				overkizState.characteristics.target
					.on('set', accessory.setTarget.bind(accessory, overkizState))
					.updateValue(overkizState.convert(state.value));
			}
			if(overkizState.characteristics.status != null) {
				overkizState.characteristics.status
					.updateValue(overkizState.getStatus(false));
			}
		}

		return [informationService, this.service];
    },
    
    /* Generic commands */
	
	identify: function(callback) {
		//this.executeCommand({ type:1, name: 'identify', parameters: [] }, callback, function() {});
		callback();
	},
	
    /*
		Refresh component state
		Return state in cache
	*/
	getState: function(state, callback) {
		var that = this;
        this.requestState(state.name, function(error, value) {
        	if(error) {
        		that.log(error);
        		callback(error);
        	} else {
        		var convert = state.convert(value);
        		callback(null, convert);
            	that.log('['+that.name+'] ' + state.name + "=" + value);
            }
        });
	},
	
	/*
		Modify the target for the 'name' state and execute the corresponding command
		name: The state name
		value: The new value of the state
		callback: HomeKit callback
	*/
	setTarget: function(state, value, callback) {
		var that = this;
		// Obtain the Overkiz corresponding command for this state and this new value
		var command = state.getCommand(value);
		if(command == null) {
			callback(new Error('No command configured'));
		} else {
			that.log('['+that.name+'] ' + "Set " + state.name + " to " + value + " => " + command.name + "(" + command.parameters + ")");
			this.executeCommand(command, function(status, err) {
				switch(status) {
					case execution.INIT:
						callback(err);
					break;
					case execution.START:
						// Command started callback
						if(err == null) {
							// Update command status characteristic
							if(state.characteristics.status != null)
								state.characteristics.status.updateValue(state.getStatus(true));
						} else 
							that.log(err);
					break;
					case execution.END:
						// Command executed callback
						// Update command state characteristic
						if(state.characteristics.status != null)
							state.characteristics.status.updateValue(state.getStatus(false));
			
						// Update state characteristic
						that.requestState(state.name, function(error, value) {
							var convert = state.convert(value);
							if(state.characteristics.main != null)
								state.characteristics.main.updateValue(convert);
							if(state.characteristics.target != null)
								state.characteristics.target.updateValue(convert);
							that.log('['+that.name+'] ' + command.name + ' ' + (err == null ? 'OK' : err) + ' (' + state.name + '=' + convert + ')');
						});
					break;
					default:
						that.log("Bad execution state %s", status);
					break;
				}
			});
		}
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
				if(that.currentCommand != null && that.currentCommand.execpoll != null)
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