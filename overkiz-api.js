var request = require("request").defaults({ jar: true })
var pollingtoevent = require('polling-to-event');

Command = function(name) {
    this.type = 1;
    this.name = name;
    this.parameters = [];
}

Execution = function(name, deviceURL, command) {
    this.label = name;
    this.metadata = null;
    this.actions = [{
        deviceURL: deviceURL,
        commands: [command]
    }];
}

ExecutionState = {
    INITIALIZED: 'INITIALIZED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

State = {
	STATE_MANUFACTURER: "core:ManufacturerState",
	STATE_MODEL: "core:ModelState",
	STATE_CLOSURE: "core:ClosureState",
	STATE_OPEN_CLOSED: "core:OpenClosedState",
	STATE_OPEN_CLOSED_PEDESTRIAN: "core:OpenClosedPedestrianState",
	STATE_LOCKED_UNLOCKED: "core:LockedUnlockedState",
	STATE_PRIORITY_LOCK: "core:PriorityLockLevelState",
	STATE_ACTIVE_ZONES: "core:ActiveZonesState",
	STATE_TARGET_TEMP: "core:TargetTemperatureState",
	STATE_HEATING_ON_OFF: "core:HeatingOnOffState",
	STATE_OPEN_CLOSED_UNKNOWN: 'core:OpenClosedUnknownState',
	STATE_RSSI: 'core:RSSILevelState',
	STATE_ON_OFF: 'core:OnOffState',
	STATE_INTENSITY: 'core:IntensityState'
};

Server = {
	'Cozytouch': 'ha110-1.overkiz.com',
	'TaHoma': 'tahomalink.com'
}

module.exports = {
    Command: Command,
    Execution: Execution,
    ExecutionState: ExecutionState,
    State: State,
    Api: OverkizApi
}

function OverkizApi(log, config) {
	this.log = log;
    
    // Default values
    this.pollingPeriod = config['pollingPeriod'] || 2; // Poll for events every 2 seconds by default
    this.refreshPeriod = config['refreshPeriod'] || (60 * 10); // Refresh device states every 10 minutes by default
    this.service = config['service'] || 'TaHoma';
    
    this.user = config['user'];
    this.password = config['password'];
    this.server = Server[this.service];
    
    if (!this.user || !this.password) throw new Error("You must provide credentials ('user'/'password')");
    if (!this.server) throw new Error("Invalid service name '"+this.service+"'");
    
    this.isLoggedIn = false;
    this.listenerId = null;
    this.executionCallback = [];
    this.platformAccessories = [];
    this.stateChangedEventListener = null;

    var that = this;
    this.eventpoll = pollingtoevent(function(done) {
    	if (that.listenerId != null) {
        	that.post({
                url: that.urlForQuery("/events/" + that.listenerId + "/fetch"),
                json: true
            }, function(error, data) {
            	done(error, data);
            });
        } else {
            done(null, []);
        }
    }, {
        longpolling: true,
        interval: (1000 * this.pollingPeriod)
    });

    this.eventpoll.on("longpoll", function(data) {
        for (event of data) {
            if (event.name == 'DeviceStateChangedEvent') {
                if (that.stateChangedEventListener != null)
                    that.stateChangedEventListener.onStatesChange(event.deviceURL, event.deviceStates);
            } else if (event.name == 'ExecutionStateChangedEvent') {
                var cb = that.executionCallback[event.execId];
                if (cb != null) {
                    cb(event.newState, event.failureType == undefined ? null : event.failureType);
                    if (event.timeToNextState == -1) { // No more state expected for this execution
                        delete that.executionCallback[event.execId];
                        if(Object.keys(that.executionCallback).length == 0) { // Unregister listener when no more execution running
                        	that.unregisterListener();
                        }
                    }
                }
            }
        }
    });

    this.eventpoll.on("error", function(error) {
    	that.listenerId = null;
    });
    
    var refreshpoll = pollingtoevent(function(done) {
    	that.refreshStates(function(error, data) {
    		setTimeout(function() {
    			that.getDevices(function(error, data) {
					if (!error) {
						for (device of data) {
							if (that.stateChangedEventListener != null) {
                    			that.stateChangedEventListener.onStatesChange(device.deviceURL, device.states);
                    		}
						}
					}
				});
    		}, 10 * 1000); // Read devices states after 10s
    		done(error, data);
    	});
    }, {
        longpolling: true,
        interval: (1000 * this.refreshPeriod)
    });
    
    refreshpoll.on("error", function(error) {
        that.log(error);
    });
}

OverkizApi.prototype = {
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
    
    getDevices(callback) {
    	this.get({
				url: this.urlForQuery("/setup/devices"),
				json: true
			}, function(error, json) {
				callback(error, json);
			});
    },
    
    getActionGroups(callback) {
    	this.get({
				url: this.urlForQuery("/actionGroups"),
				json: true
			}, function(error, json) {
				callback(error, json);
			});
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
                callback(err);
            } else if (response != undefined && (response.statusCode < 200 || response.statusCode >= 300)) {
            	var msg = 'Error ' + response.statusCode;
            	if(json.error != null)
            		msg += ' ' + json.error;
                if(json.errorCode != null)
            		msg += ' (' + json.errorCode + ')';
            	that.log(msg);
                callback(msg);
            } else {
                callback(null, json);
            }
        };
        if (this.isLoggedIn) {
            myRequest(authCallback);
        } else {
            this.log.debug("Connecting " + this.service + " server...");
            var that = this;
            request.post({
                url: this.urlForQuery("/login"),
                form: {
                    'userId': this.user,
                    'userPassword': this.password
                },
                json: true
            }, function(err, response, json) {
                if (err) {
                    that.log.warn("Unable to login: " + err);
                } else if (json.success) {
                    that.isLoggedIn = true;
                    myRequest(authCallback);
                } else if (json.error) {
                    that.log.warn("Loggin fail: " + json.error);
                } else {
                    that.log.error("Unable to login");
                }
            });
        }
    },

    registerListener: function() {
        var that = this;
        if(this.listenerId == null) {
        	this.log.debug('Register listener');
			this.post({
				url: that.urlForQuery("/events/register"),
				json: true
			}, function(error, data) {
				if(!error) {
					that.listenerId = data.id;
				}
			});
		}
    },
    
    unregisterListener: function() {
        var that = this;
        if(this.listenerId != null) {
        	this.log.debug('Unregister listener');
			this.post({
				url: that.urlForQuery("/events/" + this.listenerId + "/unregister"),
				json: true
			}, function(error, data) {
				if(!error) {
					that.listenerId = null;
				}
			});
        }
    },
    
    refreshStates: function(callback) {
    	this.put({
			url: this.urlForQuery("/setup/devices/states/refresh"),
			json: true
		}, function(error, data) {
			callback(error, data);
		});
    },

    requestState: function(deviceURL, state, callback) {
        var that = this;
        this.get({
            url: this.urlForQuery("/setup/devices/" + encodeURIComponent(deviceURL) + "/states/" + encodeURIComponent(state)),
            json: true
        }, function(error, data) {
            //that.log(data);
            callback(error, data.value);
        });
    },

    cancelCommand: function(execId, callback) {
        var that = this;
        this.delete({
            url: this.urlForQuery("/exec/current/setup/" + execId),
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
    executeCommand: function(execution, callback) {
        this.execute('apply', execution, callback);
    },
    
    /*
    	oid: The command OID or 'apply' if immediate execution
    	execution: Body parameters
    	callback: Callback function executed when command sended
    */
    execute: function(oid, execution, callback) {
        var that = this;
        //this.log(command);
        this.post({
            url: that.urlForQuery('/exec/'+oid),
            body: execution,
            json: true
        }, function(error, json) {
            if (error == null) {
                callback(ExecutionState.INITIALIZED, null, json); // Init OK
                that.executionCallback[json.execId] = callback;
                that.registerListener();
            } else {
                callback(ExecutionState.INITIALIZED, error);
            }
        });
    },

    setDeviceStateChangedEventListener: function(listener) {
        this.stateChangedEventListener = listener;
    }
}