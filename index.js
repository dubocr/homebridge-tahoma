var Accessory, Service, Characteristic, UUIDGen, Types;

var request = require("request").defaults({ jar: true })
var pollingtoevent = require('polling-to-event');

/*
	Overkiz states
*/
const STATE_CLOSURE = "core:ClosureState";
const STATE_OPEN_CLOSED = "core:OpenClosedState";
const STATE_LOCKED_UNLOCKED = "core:LockedUnlockedState";
const STATE_PRIORITY_LOCK = "core:PriorityLockLevelState";
const STATE_ACTIVE_ZONES = "core:ActiveZonesState";

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
    	case "TaHoma": 
    		this.server = "tahomalink.com";
    	break;
    	case "Cozytouch":
    	default:
    		this.server = "ha110-1.overkiz.com";
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
            if (response.statusCode == 401) {
                that.isLoggedIn = false;
                that.log(json.error);
                that.requestWithLogin(myRequest, callback);
            } else if (err) {
                that.log("There was a problem requesting to Overkiz : " + err);
                callback("There was a problem requesting to Overkiz : " + err);
            } else if (response.statusCode < 200 || response.statusCode >= 300) {
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
    this.states = [];
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
            	this.states[STATE_CLOSURE] = this.overkiz2HomekitCharacteristic(STATE_CLOSURE, this._look_state(STATE_CLOSURE)).value;
    			this.service = new Service.WindowCovering(this.device.label);
                this.service.getCharacteristic(Characteristic.CurrentPosition)
                    .on('get', this.refreshState.bind(this, STATE_CLOSURE));
                this.service.getCharacteristic(Characteristic.TargetPosition)
                    .on('set', this.modifyState.bind(this, STATE_CLOSURE))
                    .on('get', this.getState.bind(this, STATE_CLOSURE));
                this.service.getCharacteristic(Characteristic.PositionState)
                    .on('get', this.getCommandState.bind(this, STATE_CLOSURE));
            break;
            case "DoorLock":
    			this.states[STATE_LOCKED_UNLOCKED] = this.overkiz2HomekitCharacteristic(STATE_LOCKED_UNLOCKED, this._look_state(STATE_LOCKED_UNLOCKED)).value;
    			this.service = new Service.LockMechanism(this.device.label);
                this.service.getCharacteristic(Characteristic.LockCurrentState)
                    .on('get', this.refreshState.bind(this, STATE_LOCKED_UNLOCKED));
                this.service.getCharacteristic(Characteristic.LockTargetState)
                    .on('set', this.modifyState.bind(this, STATE_LOCKED_UNLOCKED))
                    .on('get', this.getState.bind(this, STATE_LOCKED_UNLOCKED));
            break;
            case "Gate":
            	this.states[STATE_CLOSURE] = this.overkiz2HomekitCharacteristic(STATE_CLOSURE, this._look_state(STATE_CLOSURE)).value;
    			this.service = new Service.Door(this.device.label);
                this.service.getCharacteristic(Characteristic.CurrentPosition)
                    .on('get', this.refreshState.bind(this, STATE_CLOSURE));
                this.service.getCharacteristic(Characteristic.TargetPosition)
                    .on('set', this.modifyState.bind(this, STATE_CLOSURE))
                    .on('get', this.getState.bind(this, STATE_CLOSURE));
                this.service.getCharacteristic(Characteristic.PositionState)
                    .on('get', this.refreshState.bind(this, STATE_OPEN_CLOSED));
            break;
            case "Alarm":
            	this.states[STATE_ACTIVE_ZONES] = this.overkiz2HomekitCharacteristic(STATE_ACTIVE_ZONES, this._look_state(STATE_ACTIVE_ZONES)).value;
    			this.service = new Service.SecuritySystem(this.device.label);
                this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState)
                    .on('get', this.refreshState.bind(this, STATE_ACTIVE_ZONES));
                this.service.getCharacteristic(Characteristic.SecuritySystemTargetState)
                    .on('set', this.modifyState.bind(this, STATE_ACTIVE_ZONES))
                    .on('get', this.getState.bind(this, STATE_ACTIVE_ZONES));
            break;
            default:
            	var STATE = "OnOff";
            	this.states[STATE] = this.overkiz2HomekitCharacteristic(STATE, this._look_state(STATE)).value;
            	this.service = new Service.Switch(this.device.label);
                this.service.getCharacteristic(Characteristic.On)
                    .on('set', this.setState.bind(this, STATE))
                    .on('get', this.getState.bind(this, STATE));
            break;
        }

		return [informationService, this.service];
    },
    
    /* Generic commands */
	
	identify: function(callback) {
		executeCommand({ type:1, name: 'identify', parameters: [] }, callback, function() {});
	},
	
	/*
		Return cached state
	*/
	getState: function(name, callback) {
		this.log("GET STATE " + name);
		if(this.states[name] == undefined)
			callback(new Error("Undefined state name " + name));
		else
			callback(null, this.states[name]);
	},
	
	/*
		Set state in cache
	*/
	setState: function(name, value, callback) {
		this.log("SET STATE " + name + " to " + value);
		this.states[name] = value;
		callback();
	},
	
    /*
		Refresh component state
		Return state in cache
	*/
	refreshState: function(name, callback) {
		var that = this;
		callback(null, that.states[name]);
        this.requestState(name, function(error, value) {
        	c = that.overkiz2HomekitCharacteristic(name, value);
            that.states[name] = c.value;
            that.log(that.name + " : " + name + "=" + that.states[name]);
        });
	},
	
	/*
		Refresh component state
		Return state in cache
	*/
	getCommandState: function(name, callback) {
		var that = this;
		that.log("GET COMMAND STATE " + name);
		that.log(this.currentCommand);
		var characteristic = that.overkiz2HomekitCommand(name, this.currentCommand);
        callback(null, characteristic.value);
	},
	
	/*
		send command with immediate callback
	*/
	modifyState: function(name, value, callback) {
		var that = this;
        if(value != this.states[name]) {
			this.states[name] = value;
        	
        	var command = this.homekit2OverkizCommand(name, value);

        	that.log("Set " + name + " to " + value + " => " + command.name + "(" + command.parameters + ")");
        	this.executeCommand(command, function(err) {
        		// Command started callback
        		if(err == null) {
        			// Update command state characteristic
        			var commandCharac = that.overkiz2HomekitCommandState(name, that.currentCommand);
        			that.service.getCharacteristic(commandCharac.name).setValue(commandCharac.value);
        			that.log(command.name + " state updated to " + commandCharac.value);
        		}
        	}, function(err) {
        		// Command executed callback
        		// Update command state characteristic
        		var commandCharac = that.overkiz2HomekitCommandState(name, that.currentCommand);
        		that.service.getCharacteristic(commandCharac.name).setValue(commandCharac.value);
        		that.log(command.name + " state updated to " + commandCharac.value);
        		
        		// Update state characteristic
			   	that.requestState(name, function(error, value) {
			   		var characteristic = that.overkiz2HomekitCharacteristic(name,value);
			   		that.states[name] = characteristic.value;
					that.service.getCharacteristic(characteristic.name).setValue(characteristic.value);
					that.log(command.name + " ended, " + that.name + " : " + name + "=" + that.states[name]);
				});
			});
        }
        callback();
	},
    
    /*
    	Return a converted state for Homekit
    	'name': Overkiz name of the state to convert
    	'value': Current value of the state
    */
    overkiz2HomekitCharacteristic: function(name, value) {
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
			default:
				return { name: null, value: value };
			break;
		}
    },
    
    /*
    	Return a converted state for Homekit current command
    	'name': Overkiz name of the state to convert
    	'value': Current value of the state
    */
    overkiz2HomekitCommandState: function(name, command) {
    	switch(name) {
			case STATE_CLOSURE:
				if(command == null) // Not running
					return { name: Characteristic.PositionState, value: Characteristic.PositionState.STOPPED };
				else if(this.states[name] == 0)
					return { name: Characteristic.PositionState, value: Characteristic.PositionState.INCREASING };
				else
					return { name: Characteristic.PositionState, value: Characteristic.PositionState.DECREASING };
			break;
			default:
				return { name: null, value: value };
			break;
		}
    },
    
    /*
    	Return an associated command and optional params to modify this state
    	'name': Overkiz name of the state to update
    	'value': Target value
    */
    homekit2OverkizCommand: function(name, value) {
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
    
    cancelCommand: function(execId) {
        var that = this;
        this.platform.delete({
            url: this.platform.urlForQuery("/exec/current/setup/" + execId),
            json: true
        }, function(error, json) {
            that.log("Command canceled : " + execId);
        });
    },

	/*
		cmdName: The command to execute
		params: Parameter of the command
		callback: Callback function executed when command sended
		refresh: Callback function executed when command succeed
	*/
    executeCommand: function(command, execCallback, cmdEndCallback) {
        var that = this;
        if(this.currentCommand != null) {
			this.cancelCommand(this.currentCommand.id);
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
        		var execId = json.execId;
				that.currentCommand.id = execId;
				that.log(json);
			
				var execpoll = pollingtoevent(function(done) {
					that.platform.get({
						url: that.platform.urlForQuery("/exec/current/"+execId),
						json: true
					}, function(error, json) {
						done(error, json);
					});
				}, {longpolling:true,interval:500});
	
				execpoll.on("longpoll", function(data) {
					//that.log(data);
					if(data.state == undefined) { // Execution ended
						this.pause();
						that.currentCommand = null;
						that.platform.get({
							url: that.platform.urlForQuery("/history/executions/"+execId),
							json: true
						}, function(error, json) {
							if(json.execution != undefined) {
								that.log("Execution %s (%s)", json.execution.state, json.execution.failureType);
								switch(json.execution.failureType) {
									case "NO_FAILURE":
										cmdEndCallback();
									break;
									case "ACTUATORNOANSWER":
									default:
										cmdEndCallback(json.execution.failureType);
									break;
								}
							} else {
								execCallback(new Error("Unknown error"));
							}
						});
					} else {
						if(that.currentCommand != null)
							that.currentCommand.state = data.state;
						that.log("Execution %s", data.state);
						if(data.state == "IN_PROGRESS") {
							execCallback();
							//this.pause();
						}
					}
				});
			
				execpoll.on("error", function(err, data) {
					that.log("Execution error %s %s", err, data);
					this.pause();
					execCallback(err);
				});
			
			} else {
				execCallback(error);
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