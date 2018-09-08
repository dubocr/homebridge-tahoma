var Accessory, Service, Characteristic, UUIDGen, Types;

var OverkizService = require('./overkiz-api');

module.exports = function(homebridge) {
    console.log("homebridge-tahoma API version: " + homebridge.version);

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    Types = homebridge.hapLegacyTypes;

    DeviceAccessory = require('./accessories/AbstractAccessory.js')(homebridge);

    // For platform plugin to be considered as dynamic platform plugin,
    // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
    homebridge.registerPlatform("homebridge-tahoma", "Tahoma", TahomaPlatform, false);
}

function TahomaPlatform(log, config, api) {
    this.log = log;
    this.config = config;
    this.hapapi = api;

	this.exposeScenarios = config.exposeScenarios || false;
	this.exclusions = config.exclude || [];
	this.exclusions.push('internal'); // Exclude internal devices
	this.api = new OverkizService.Api(log, config);

    this.platformAccessories = [];

    this.api.setDeviceStateChangedEventListener(this);
}

TahomaPlatform.prototype = {
    getAccessory: function(deviceURL) {
        for (accessory of this.platformAccessories) {
        	if (accessory.deviceURL == deviceURL)
				return accessory;
        }
        
        var i1 = deviceURL.indexOf("#");
        if(i1 != -1) {
        	baseURL = deviceURL.substring(0, i1);
					//this.log.info('Search extended : ' + baseURL);
        	for (accessory of this.platformAccessories) {
				if (accessory.deviceURL != null && accessory.deviceURL.startsWith(baseURL))
				return accessory;
			}
        }
        return null;
    },

    accessories: function(callback) {
        var that = this;
        if (that.platformAccessories.length == 0) {
        	that.loadDevices(function() {
            	if(that.exposeScenarios) {
              	that.loadScenarios(function() {
              		callback(that.platformAccessories);
              	});
              } else {
              	callback(that.platformAccessories);
              }
            });
        } else {
            callback(this.platformAccessories);
        }
    },
 
 /*
	configureAccessory: function(accessory) {
	  this.log(accessory.displayName, "Configure Accessory");
	},
*/
    loadDevices: function(callback) {
    	var that = this;
    	this.platformAccessories = [];
    	this.api.getDevices(function(error, data) {
    			that.log.debug('Device found: ' + data.length);
				if (!error) {
					var ignoredDevices = [];
					for (device of data) {
						var accessory = null;
						var protocol = device.controllableName.split(':').shift(); // Get device protocol name
						var accessoryConfig = that.config[device.uiClass] || {};
						if(DeviceAccessory[device.uiClass] != null) {
							that.log.info('[' + device.label + ']' + ' device type: ' + device.uiClass + ', name: ' + device.controllableName + ', protocol: ' + protocol);
							if(that.exclusions.indexOf(protocol) == -1 && that.exclusions.indexOf(device.label) == -1) {
								accessory = new DeviceAccessory[device.uiClass](that.log, that.api, device, accessoryConfig);
								if(device.states != null) {
									for (state of device.states) {
										accessory.onStateUpdate(state.name, state.value);
									}
								}
								that.platformAccessories.push(accessory);
								//that.hapapi.registerPlatformAccessories("homebridge-tahoma", "Tahoma", [accessory]);
							} else {
								ignoredDevices.push(device);
							}
						} else {
							that.log.info('Device type ' + device.uiClass + ' unknown');
						}
					}
					
					for (device of ignoredDevices) {
						accessory = that.getAccessory(device.deviceURL);
						if(accessory != null) {
							accessory.merge(device);
							if(device.states != null) {
								for (state of device.states) {
									accessory.onStateUpdate(state.name, state.value);
								}
							}
							that.log.info('Device ' + device.label + ' merged with ' + accessory.name);
						} else {
							that.log.info('Device ' + device.uiClass + ' ignored');
						}
					}
				}
				callback();
			});
    },
    
    loadScenarios: function(callback) {
    	var that = this;
    	this.api.getActionGroups(function(error, data) {
				if (!error) {
					for (scenario of data) {
						if(!Array.isArray(that.exposeScenarios) || that.exposeScenarios.indexOf(scenario.label) != -1) {
							var scenarioAccessory = new ScenarioAccessory(scenario.label, scenario.oid, that.log, that.api);
							that.platformAccessories.push(scenarioAccessory);
							//that.hapapi.registerPlatformAccessories("homebridge-tahoma", "Tahoma", [scenarioAccessory]);
						}
					}
				}
				callback();
			});
    },
    
    onStatesChange: function(deviceURL, states) {
        accessory = this.getAccessory(deviceURL);
        if (accessory != null) {
        	if(states != null) {
            	for (state of states) {
            	    accessory.onStateUpdate(state.name, state.value);
            	}
            }
        }
    }
}

function ScenarioAccessory(name, oid, log, api) {
    this.log = log;
    this.api = api;
    this.name = name;
    this.oid = oid;

    this.services = [];
		var service = new Service.Switch(name);
		this.state = service.getCharacteristic(Characteristic.On);
    this.state.on('set', this.executeScenario.bind(this));
    
    this.services.push(service); 
}

ScenarioAccessory.prototype = {
    getServices: function() {
			return this.services;
    },
    
    executeScenario: function(value, callback) {
    	var that = this;
			if (this.isCommandInProgress()) {
					this.api.cancelCommand(this.lastExecId, function() {});
			}
			
			if(value) {
				this.api.execute(this.oid, null, function(status, error, data) {
					if(!error) {
						if (status == ExecutionState.INITIALIZED)
							that.lastExecId = data.execId;
						if (status == ExecutionState.FAILED || status == ExecutionState.COMPLETED) {
							that.log.info('[Scenario] ' + that.name + ' ' + (error == null ? status : error));
							that.state.updateValue(0);
						}
					}
				});
			}
			callback();
    },
    
    isCommandInProgress: function() {
        return (this.lastExecId in this.api.executionCallback);
    }
}
