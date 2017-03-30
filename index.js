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
        return null;
    },

    accessories: function(callback) {
        var that = this;
        this.log.info("Fetching accessories...");
        if (that.platformAccessories.length == 0) {
            this.api.getDevices(function(error, data) {
                if (!error) {
                    for (device of data) {
                    	var accessory = null;
                    	var protocol = device.controllableName.split(':').shift(); // Get device protocol name
                    	var accessoryConfig = that.config[device.uiClass] || {};
                    	if(DeviceAccessory[device.uiClass] != null && that.exclusions.indexOf(protocol) == -1 && that.exclusions.indexOf(device.label) == -1) {
                    		accessory = new DeviceAccessory[device.uiClass](that.log, that.api, device, accessoryConfig);
                    	} else {
                    		that.log.info('Device ' + device.uiClass + ' ignored');
						}
						if(accessory != null) {
							if(device.states != null) {
								for (state of device.states) {
									accessory.onStateUpdate(state.name, state.value);
								}
							}
							that.platformAccessories.push(accessory);
						}
                    }
                }
                callback(that.platformAccessories);
            });
        } else {
            callback(this.platformAccessories);
        }
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