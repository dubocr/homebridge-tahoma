var Accessory, Service, Characteristic, UUIDGen;

var request = require("request").defaults({ jar: true })
var pollingtoevent = require('polling-to-event');

module.exports = function(homebridge) {
    console.log("homebridge-overkiz API version: " + homebridge.version);

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

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
                if (device.uiClass == 'Pod') continue;
                accessory = new OverkizAccessory(that.log, that, device);
                foundAccessories.push(accessory);
            }
            callback(foundAccessories);
        });
    },
    
    getServices: function() {
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Somfy")
            .setCharacteristic(Characteristic.Model, "Bridge")
            .setCharacteristic(Characteristic.SerialNumber, "0000-0000-0000");

		return [informationService];
    }
}

function OverkizAccessory(log, platform, device) {
    // device info
    this.log = log;
    this.platform = platform;

    this.name = device.label;
    this.deviceURL = device.deviceURL;
    this.device = device;
}

OverkizAccessory.prototype = {
	identify: function(callback) {
		this.log("Identify requested!");
		callback(); // success
	},
	
    getServices: function() {
        // you can OPTIONALLY create an information service if you wish to override
        // the default values for things like serial number, model, etc.
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Somfy")
            .setCharacteristic(Characteristic.Model, this.device.controllableName)
            .setCharacteristic(Characteristic.SerialNumber, this.device.deviceURL);

		switch (this.device.widget) {
            case "PositionableRollerShutter":
            	this.targetPosition = 100;
                this.service = new Service.WindowCovering(this.device.label);
                this.service.getCharacteristic(Characteristic.CurrentPosition)
                    .on('get', this.getCurrentPosition.bind(this));
                this.service.getCharacteristic(Characteristic.TargetPosition)
                    .on('set', this.setTargetPosition.bind(this))
                    .on('get', this.getTargetPosition.bind(this));
                this.service.getCharacteristic(Characteristic.PositionState)
                    .on('set', this.getPositionState.bind(this));
                break;
            default:
                break;
        }

		if(this.service != null)
        	return [informationService, this.service];
        else
        	return [informationService];
    },

    requestState: function(state, callback) {
        var that = this;
        this.platform.get({
            url: this.platform.urlForQuery("/setup/devices/" + encodeURIComponent(this.deviceURL) + "/states/" + encodeURIComponent(state)),
            json: true
        }, function(error, json) {
            that.log(json);
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

    getCurrentPosition(callback) {
        var that = this;
        this.requestState("core:ClosureState", function(error, value) {
            var position = 100 - value;
            that.log(that.name + " opened at " + position);
            that.targetPosition = position;
            //callback(error, position);
        });
        callback(null, this.targetPosition);
    },

	getTargetPosition(callback) {
        callback(null, this.targetPosition);
    },
    
    setTargetPosition(level, callback) {
    	//this.log("Set position to " + level);
        var that = this;
        if(level != this.targetPosition) {
			this.targetPosition = level;
        	
        	var target = 100 - level;
        	that.log("Set position to " + level);
        	this.executeCommand("setPosition", [target], function() {}, function() {
			   that.requestState("core:ClosureState", function(error, value) {
					var position = 100 - value;
					that.log(that.name + " opened at " + position);
				});
			});
        }
        callback();
    },

    getPositionState(callback) {
    	this.requestState("core:OpenClosedState", function(error, value) {
    		var positionState = Characteristic.PositionState.STOPPED;
            switch(value) {
            	case "open": callback(null, Characteristic.PositionState.DECREASING); break;
            	case "close": callback(null, Characteristic.PositionState.INCREASING); break;
            	default: callback(null, Characteristic.PositionState.STOPPED); break;
            }
            callback(error, position);
        });
    }
};