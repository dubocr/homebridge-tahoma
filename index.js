var Log, Services, mapping, Homebridge;
var path = require('path');
var fs = require('fs');
var { Api } = require('./overkiz-api');
var OverkizDevice = require('./overkiz-device');

module.exports = function(homebridge) {
	console.log("homebridge-tahoma API version: " + homebridge.version);
	
	Homebridge = homebridge;
    mapping = JSON.parse(fs.readFileSync(__dirname + '/mapping.json'));

    // For platform plugin to be considered as dynamic platform plugin,
    // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
    homebridge.registerPlatform("homebridge-tahoma", "Tahoma", TahomaPlatform, false);
}

function TahomaPlatform(log, config, api) {
    Log = log;
    Log = log;
    this.config = config;
    this.hapapi = api;

	this.exposeScenarios = config.exposeScenarios || false;
	this.exclusions = config.exclude || [];
	this.exclusions.push('internal'); // Exclude internal devices
	this.forceType = config.forceType || {};
	this.api = new Api(log, config);
	
	Services = [];
	// load up all services
	var servicesDir = __dirname + '/services/';
	var scriptName = path.basename(__filename);

	fs.readdirSync(servicesDir).forEach(function(file) {
		if (file != scriptName && file.indexOf('.js') > 0) {
			var name = file.replace('.js', '');
			Services[name] = require(path.join(servicesDir, file));
		}
	});
	
    this.platformAccessories = [];
    this.platformDevices = [];

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
					//Log.info('Search extended : ' + baseURL);
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
					//Log.info('Search extended : ' + baseURL);
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
	  Log(accessory.displayName, "Configure Accessory");
	},
*/
	
    loadDevices: function(callback) {
    	var that = this;
    	this.platformAccessories = [];
    	this.api.getDevices(function(error, data) {
    			if (!error) {
					Log.debug('Device found: ' + data.length);
					var devicesComponents = [];
					for (device of data) {
						var protocol = device.controllableName.split(':').shift(); // Get device protocol name
						Log.info('[' + device.label + ']' + ' device type: ' + device.uiClass + ' > ' + device.widget + ', name: ' + device.controllableName + ', protocol: ' + protocol);
						if(that.exclusions.indexOf(protocol) == -1 && that.exclusions.indexOf(device.label) == -1) {
							device = new OverkizDevice(Homebridge, Log, this.api, device);
							var deviceDefinition = mapping[device.widget];
							if(deviceDefinition == undefined) {
								deviceDefinition = mapping[device.uiClass];
							}
							if(deviceDefinition == undefined) {
								Log.info('No definition found for ' + device.uiClass + ' > ' + device.widget);
							} else {
								var services = [];
								if(deviceDefinition instanceof Array) {
									for(var s of deviceDefinition) {
										services[s] = that.config[s] || {};
									}
								} else if(deviceDefinition instanceof Object) {
									for(var service in deviceDefinition) {
										var config = that.config[s] || {};
										Object.assign(config, deviceDefinition[service]);
										services[s] = config;
									}
								} else if(deviceDefinition != undefined) {
									services[deviceDefinition] = that.config[deviceDefinition] || {};
								}
								
								for(var service in services) {
									if(Services[service] == undefined) {
										Log.info('Service ' + service + ' not implemented');
									} else {
										var config = services[service];
										device.services.push(new Services[service](Homebridge, Log, device, config));
										Log.info('Instanciate ' + device.name + ' as ' + service);
										this.platformDevices.push(device);
									}
								}
							}
						} else {
							Log.info('Device ' + device.uiClass + ' ignored');
						}
					}
					
					this.platformDevices.sort(function(a, b) {
						return that.getDeviceComponentID(a.deviceURL) > that.getDeviceComponentID(b.deviceURL);
					});
					for (device of this.platformDevices) {
						var main = this.getMainDevice(device.deviceURL);
						if(main != null) {
							main.merge(device);
							Log.info('Device ' + main.name + ' merged with ' + device.name);
						}
					}

					for (device of this.platformDevices) {
						device.onStatesUpdate(device.states);
						this.platformAccessories.push(device.getAccessory(Homebridge));
					}
				}
				callback(error);
			}.bind(this));
    },
    
    loadScenarios: function(callback) {
    	var that = this;
    	this.api.getActionGroups(function(error, data) {
				if (!error) {
					for (scenario of data) {
						if(!Array.isArray(that.exposeScenarios) || that.exposeScenarios.indexOf(scenario.label) != -1) {
							var scenarioAccessory = new ScenarioAccessory(scenario.label, scenario.oid, that.api);
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

function ScenarioAccessory(name, oid, api) {
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
							Log.info('[Scenario] ' + that.name + ' ' + (error == null ? status : error));
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
