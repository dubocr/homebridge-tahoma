var Accessory, Service, Characteristic, UUIDGen, Types, mapping;

var fs = require('fs');
var OverkizService = require('overkiz-api');

module.exports = function(homebridge) {
	console.log("homebridge-tahoma API version: " + homebridge.version);
		
    mapping = fs.readFileSync('mapping.json');

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    Types = homebridge.hapLegacyTypes;

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
	this.forceType = config.forceType || {};
	this.api = new OverkizService.Api(log, config);
	OverkizDevice = require('overkiz-device')(homebridge, this.log, this.api);

    this.platformAccessories = [];

    this.api.setDeviceStateChangedEventListener(this);
}

TahomaPlatform.prototype = {
    getDevice: function(deviceURL) {
        for (accessory of this.platformDevices) {
        	if (accessory.deviceURL == deviceURL)
				return accessory;
        }
        
        var i1 = deviceURL.indexOf("#");
        if(i1 != -1) {
        	baseURL = deviceURL.substring(0, i1);
					//this.log.info('Search extended : ' + baseURL);
        	for (accessory of this.platformDevices) {
				if (accessory.deviceURL != null && accessory.deviceURL == baseURL+'#1') // accessory.deviceURL.startsWith(baseURL)
				return accessory;
			}
        }
        return null;
    },
    
    getDeviceComponentID: function(deviceURL) {
        var i1 = deviceURL.indexOf("#");
        if(i1 != -1) {
        	return parseInt(deviceURL.substring(i1+1));
        }
        return 1;
	},
	
	getMainDevice: function(deviceURL) {
        var i1 = deviceURL.indexOf("#");
        if(i1 != -1) {
        	baseURL = deviceURL.substring(0, i1);
					//this.log.info('Search extended : ' + baseURL);
        	for (device of this.platformDevices) {
				if(device.deviceURL == deviceURL) {
					return null;
				} else if (device.deviceURL == baseURL+'#1') { // accessory.deviceURL.startsWith(baseURL)
					return device;
				}
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
    			if (!error) {
					that.log.debug('Device found: ' + data.length);
					var devicesComponents = [];
					for (device of data) {
						var protocol = device.controllableName.split(':').shift(); // Get device protocol name
						that.log.info('[' + device.label + ']' + ' device type: ' + device.uiClass + ', name: ' + device.controllableName + ', protocol: ' + protocol);
						if(that.exclusions.indexOf(protocol) == -1 && that.exclusions.indexOf(device.label) == -1) {
							device = OverkizDevice.getInstance(device);
							if(device.accessory != null) {
								this.log.info('Instanciate ' + device.name + ' as ' + device.mapper.service);
								this.platformDevices.push(device);
							} else {
								this.log.info('Device type ' + device.uiClass + ' unknown');
							}
						} else {
							that.log.info('Device ' + device.uiClass + ' ignored');
						}
					}
					
					this.platformDevices.sort(function(a, b) {
						return that.getDeviceComponentID(a.deviceURL) > that.getDeviceComponentID(b.deviceURL);
					});
					for (device of this.platformDevices) {
						var main = this.getMainDevice(device.deviceURL);
						if(main != null) {
							main.merge(device);
							that.log.info('Device ' + d.label + ' merged with ' + device.name);
						}
					}

					for (device of this.platformDevices) {
						device.onStatesUpdate(device.states);
						this.platformAccessories.push(device.accessory);
					}
				}
				callback(error);
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
				callback(error);
			});
    },
    
    onStatesChange: function(deviceURL, states) {
		if(states != null) {
			device = this.getDevice(deviceURL);
			if (device != null) {
				device.onStatesUpdate(states, deviceURL);
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
