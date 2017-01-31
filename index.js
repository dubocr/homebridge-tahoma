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
    log('Init ' + config.service + ' platform');
    this.log = log;

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
        this.log("Fetching Overkiz accessories...");
        if (that.platformAccessories.length == 0) {
            this.api.get({
                url: that.api.urlForQuery("/setup"),
                json: true
            }, function(error, json) {
                if (!error) {
                    for (device of json.devices) {
                    	var accessory = null;
                    	if(DeviceAccessory[device.uiClass] != null) {
                    		accessory = new DeviceAccessory[device.uiClass](that.log, that.api, device);
                    	} else {
                    		that.log('Device ' + device.uiClass + ' ignored');
						}
						if(accessory != null) {
							for (state of device.states) {
								accessory.onStateUpdate(state.name, state.value);
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

    onStateChangeEvent: function(event) {
        accessory = this.getAccessory(event.deviceURL);
        if (accessory != null) {
            for (state of event.deviceStates) {
                accessory.onStateUpdate(state.name, state.value);
            }
        }
    }
}