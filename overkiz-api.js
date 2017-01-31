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
	STATE_OPEN_CLOSED_UNKNOWN: 'core:OpenClosedUnknownState'
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
    this.pollingPeriod = config['pollingPeriod'] || 5; // Poll for events every 5 seconds by default
    this.refreshPeriod = config['refreshPeriod'] || (60 * 10); // Refresh device states every 10 minutes by default
    this.service = config['service'] || 'TaHoma';
    
    this.user = config['user'];
    this.password = config['password'];
    this.server = Server[this.service];

    this.isLoggedIn = false;
    this.listenerId = null;
    this.executionCallback = [];
    this.platformAccessories = [];
    this.stateChangedEventListener = null;

    var that = this;
    var eventpoll = pollingtoevent(function(done) {
        if (that.listenerId != null) {
            request.post({
                url: that.urlForQuery("/events/" + that.listenerId + "/fetch"),
                json: true
            }, function(error, response, data) {
            	if (error || (response != undefined && (response.statusCode < 200 || response.statusCode >= 300))) { // Reauthenticated
                    that.log('Suspend event polling');
            		that.listenerId = null;
                    done(null, []);
                } else {
                    done(null, data);
                }

            });
        } else {
            done(null, []);
        }
    }, {
        longpolling: true,
        interval: (1000 * this.pollingPeriod)
    });

    eventpoll.on("longpoll", function(data) {
        for (event of data) {
            if (event.name == 'DeviceStateChangedEvent') {
                if (that.stateChangedEventListener != null)
                    that.stateChangedEventListener.onStateChangeEvent(event);

            } else if (event.name == 'ExecutionStateChangedEvent') {
                var cb = that.executionCallback[event.execId];
                if (cb != null) {
                    cb(event.newState, event.failureType == undefined ? null : event.failureType);
                    if (event.timeToNextState == -1) // No more state expected for this execution
                        delete that.executionCallback[event.execId];
                }
            }
        }
    });

    eventpoll.on("error", function(error) {
        that.log(error);
    });
    
    var refreshpoll = pollingtoevent(function(done) {
    	if (that.listenerId != null) {
			request.put({
				url: that.urlForQuery("/setup/devices/states/refresh"),
				json: true
			}, function(error, response, data) {
				done(error, data);
			});
		} else {
            done(null, null);
        }
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

    requestWithLogin: function(myRequest, callback) {
        var that = this;
        var authCallback = function(err, response, json) {
            if (response != undefined && response.statusCode == 401) { // Reauthenticated
                that.isLoggedIn = false;
                that.listenerId = null;
                that.log(json.error);
                that.requestWithLogin(myRequest, callback);
            } else if (err) {
                that.log("There was a problem requesting to Overkiz : " + err);
                callback("There was a problem requesting to Overkiz : " + err);
            } else if (response != undefined && (response.statusCode < 200 || response.statusCode >= 300)) {
                that.log(json.errorCode + " (" + response.statusCode + ") : " + json.error);
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
                if (err) {
                    that.log("Unable to login: " + err);
                } else if (json.success) {
                    that.isLoggedIn = true;
                    myRequest(authCallback);
                    that.registerListener();
                } else if (json.error) {
                    that.log("Loggin fail: " + json.error);
                } else {
                    that.log("Unable to login");
                }
            });
        }
    },

    registerListener: function() {
        var that = this;
        this.post({
            url: that.urlForQuery("/events/register"),
            json: true
        }, function(error, data) {
            that.listenerId = data.id;
        });
    },

    requestState: function(deviceURL, state, callback) {
        var that = this;
        this.get({
            url: this.urlForQuery("/setup/devices/" + encodeURIComponent(deviceURL) + "/states/" + encodeURIComponent(state)),
            json: true
        }, function(error, json) {
            //that.log(json);
            callback(error, json.value);
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
    executeCommand: function(deviceURL, command, callback) {
        var that = this;
        var execution = new Execution('Homekit command', deviceURL, command);
        //this.log(command);
        this.post({
            url: that.urlForQuery("/exec/apply"),
            body: execution,
            json: true
        }, function(error, json) {
            if (error == null) {
                callback(ExecutionState.INITIALIZED, null, json); // Init OK
                that.executionCallback[json.execId] = callback;
            } else {
                callback(ExecutionState.INITIALIZED, error);
            }
        });
    },

    setDeviceStateChangedEventListener: function(listener) {
        this.stateChangedEventListener = listener;
    }
}