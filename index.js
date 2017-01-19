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
            .setCharacteristic(Characteristic.Manufacturer, "Somfy")
            .setCharacteristic(Characteristic.Model, this.device.uiClass)
            .setCharacteristic(Characteristic.SerialNumber, this.device.deviceURL);
    
		switch (this.device.uiClass) {
            case "RollerShutter":
    			this.states[STATE_CLOSURE] = this.overkiz2HomekitState(STATE_CLOSURE, this._look_state(STATE_CLOSURE));
    			service = new Service.WindowCovering(this.device.label);
                service.getCharacteristic(Characteristic.CurrentPosition)
                    .on('get', this.refreshState.bind(this, STATE_CLOSURE));
                service.getCharacteristic(Characteristic.TargetPosition)
                    .on('set', this.modifyState.bind(this, STATE_CLOSURE))
                    .on('get', this.getState.bind(this, STATE_CLOSURE));
                service.getCharacteristic(Characteristic.PositionState)
                    .on('set', this.refreshState.bind(this, STATE_OPEN_CLOSED));
            break;
            case "DoorLock":
    			this.states[STATE_LOCKED_UNLOCKED] = this.overkiz2HomekitState(STATE_LOCKED_UNLOCKED, this._look_state(STATE_LOCKED_UNLOCKED));
    			service = new Service.LockMechanism(this.device.label);
                service.getCharacteristic(Characteristic.LockCurrentState)
                    .on('get', this.refreshState.bind(this, STATE_LOCKED_UNLOCKED));
                service.getCharacteristic(Characteristic.LockTargetState)
                    .on('set', this.modifyState.bind(this, STATE_LOCKED_UNLOCKED))
                    .on('get', this.getState.bind(this, STATE_LOCKED_UNLOCKED));
            break;
            case "Gate":
            	this.states[STATE_CLOSURE] = this.overkiz2HomekitState(STATE_CLOSURE, this._look_state(STATE_CLOSURE));
    			service = new Service.Door(this.device.label);
                service.getCharacteristic(Characteristic.CurrentPosition)
                    .on('get', this.refreshState.bind(this, STATE_CLOSURE));
                service.getCharacteristic(Characteristic.TargetPosition)
                    .on('set', this.modifyState.bind(this, STATE_CLOSURE))
                    .on('get', this.getState.bind(this, STATE_CLOSURE));
                service.getCharacteristic(Characteristic.PositionState)
                    .on('set', this.refreshState.bind(this, STATE_OPEN_CLOSED));
            break;
            case "Alarm":
            	this.states[STATE_PRIORITY_LOCK] = this.overkiz2HomekitState(STATE_PRIORITY_LOCK, this._look_state(STATE_PRIORITY_LOCK));
    			service = new Service.SecuritySystem(this.device.label);
                service.getCharacteristic(Characteristic.SecuritySystemCurrentState)
                    .on('get', this.refreshState.bind(this, STATE_PRIORITY_LOCK));
                service.getCharacteristic(Characteristic.SecuritySystemTargetState)
                    .on('set', this.modifyState.bind(this, STATE_PRIORITY_LOCK))
                    .on('get', this.getState.bind(this, STATE_PRIORITY_LOCK));
            break;
            default:
            	var STATE = "OnOff";
            	this.states[STATE] = this.overkiz2HomekitState(STATE, this._look_state(STATE));
            	service = new Service.Switch(this.device.label);
                service.getCharacteristic(Characteristic.On)
                    .on('set', this.setState.bind(this, STATE))
                    .on('get', this.getState.bind(this, STATE));
            break;
        }

		return [informationService, service];
    },
    
    /* Generic commands */
	
	identify: function(callback) {
		executeCommand('identify', [], callback, function() {});
	},
	
	/*
		Return cached state
	*/
	getState: function(name, callback) {
		if(this.states[name] == undefined)
			callback(new Error("Undefined state name " + name));
		else
			callback(null, this.states[name]);
	},
	
	/*
		Set state in cache
	*/
	setState: function(name, value, callback) {
		this.states[name] = value;
		callback();
	},
	
    /*
		Refresh component state
		Return state in cache
	*/
	refreshState: function(name, callback) {
		var that = this;
        this.requestState(name, function(error, value) {
            that.states[name] = that.overkiz2HomekitState(name, value);
            that.log(that.name + " : " + name + "=" + that.states[name]);
        });
        callback(null, this.states[name]);
	},
	
	/*
		send command with immediate callback
	*/
	modifyState: function(name, value, callback) {
		var that = this;
        if(value != this.states[name]) {
			this.states[name] = value;
        	
        	var params = this.homekit2OverkizCommand(name, value);
        	var command = params.shift();;

        	that.log("Set " + name + " to " + value + " => " + command + "(" + params + ")");
        	this.executeCommand(command, params, function() {}, function() {
			   that.requestState(name, function(error, value) {
					that.states[name] = that.overkiz2HomekitState(name,value);
					that.log(command + " ended, " + that.name + " : " + name + "=" + that.states[name]);
				});
			});
        }
        callback();
	},
	
	/*
		send command with real component callback
	*/
	modifyStateConfirm: function(name, value, callback) {
		var that = this;
        if(value != this.states[name]) {
			this.states[name] = value;
        	
        	var cp = this.homekit2OverkizCommand(name, value);
        	var command = cp[0];
        	var params = cp.shift();
        	
        	that.log("Set " + name + " to " + value + " => " + command + "(" + params + ")");
        	this.executeCommand(command, params, callback, function() {
			   that.requestState(name, function(error, value) {
					that.states[name] = that.overkiz2HomekitState(name, value);
					that.log(command + " ended, " + that.name + " : " + name + "=" + that.states[name]);
				});
			});
        }
	},
    
    /*
    	Return a converted state for Homekit
    	'name': Overkiz name of the state to convert
    	'value': Current value of the state
    */
    overkiz2HomekitState: function(name, value) {
    	switch(name) {
			case STATE_CLOSURE:
				return 100-value;
			break;
			case STATE_LOCKED_UNLOCKED:
				switch(value) {
					case "locked": return Characteristic.LockCurrentState.SECURED;
					case "unlocked": return Characteristic.LockCurrentState.UNSECURED;
					default: return Characteristic.LockCurrentState.UNKNOWN;
				}
			break;
			case STATE_OPEN_CLOSED:
				switch(value) {
					case "open": return Characteristic.PositionState.DECREASING; break;
					case "close": return Characteristic.PositionState.INCREASING; break;
					default: return Characteristic.PositionState.STOPPED; break;
				}
            break;
			default:
				return value;
			break;
		}
    },
    
    /*
    	Return an associated command and optional params to modify this state
    	'name': Overkiz name of the state to update
    	'value': Target value
    */
    homekit2OverkizCommand: function(name, value) {
    	switch(name) {
			case STATE_CLOSURE:
				return ['setPosition', 100-value];
			break;
			case STATE_OPEN_CLOSED:
				return value ? ['open'] : ['close'];
			break;
			case STATE_LOCKED_UNLOCKED:
				switch(value) {
					case Characteristic.LockCurrentState.SECURED: return ['lock'];
					case Characteristic.LockCurrentState.UNSECURED:
					case Characteristic.LockCurrentState.JAMMED:
					case Characteristic.LockCurrentState.UNKNOWN: 
					default: return ['unlock'];
				}
			break;
			case STATE_PRIORITY_LOCK:
				return value ? ['alarmOn'] : ['alarmOff'];
			break;
			default:
				return ['set'+name];
			break;
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
    executeCommand: function(cmdName, params, callback, refresh) {
        var that = this;
        if(this.lastExecId != null) {
			this.cancelCommand(this.lastExecId);
		}
        this.platform.post({
            url: that.platform.urlForQuery("/exec/apply"),
            body: {
                label: "Execution Homekit",
                metadata: null,
                actions: [{
                    deviceURL: this.deviceURL,
                    commands: [{
                        type: 1,
                        name: cmdName,
                        parameters: params
                    }]
                }]
            },
            json: true
        }, function(error, json) {
        	if(error == null) {
				var execId = json.execId;
				that.lastExecId = execId;
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
					if(data.state == undefined) { // Execution ended
						that.lastExecId = null;
						this.pause();
						that.platform.get({
							url: that.platform.urlForQuery("/history/executions/"+execId),
							json: true
						}, function(error, json) {
							if(json.execution != undefined) {
								that.log("Execution %s (%s)", json.execution.state, json.execution.failureType);
								switch(json.execution.failureType) {
									case "ACTUATORNOANSWER": 
										callback(json.execution.failureType);
									break;
									case "NO_FAILURE":
									default:
										callback();
										refresh();
									break;
								}
							} else {
								callback(json.execution.failureType);
							}
						});
					} else {
						that.log("Execution %s", data.state);
						if(data.state == "IN_PROGRESS") {
							//callback();
							//this.pause();
						}
					}
				});
			
				execpoll.on("error", function(err, data) {
					that.log("Execution error %s %s", err, data);
					this.pause();
					callback(err);
				});
			
			} else {
				callback(error);
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