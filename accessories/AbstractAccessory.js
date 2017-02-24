var Service, Characteristic;

var path = require('path');
var fs = require('fs');
var OverkizApi = require('../overkiz-api');

var inherits = function (ctor, superCtor) {

  if (ctor === undefined || ctor === null)
    throw new TypeError('The constructor to "inherits" must not be ' +
                        'null or undefined');

  if (superCtor === undefined || superCtor === null)
    throw new TypeError('The super constructor to "inherits" must not ' +
                        'be null or undefined');

  if (superCtor.prototype === undefined)
    throw new TypeError('The super constructor to "inherits" must ' +
                        'have a prototype');

  ctor.super_ = superCtor;
  Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    // load up all accessories
    var accessoriesDir = __dirname;
    var scriptName = path.basename(__filename);

    fs.readdirSync(accessoriesDir).forEach(function(file) {
        if (file != scriptName && file.indexOf('.js') > 0) {
            var name = file.replace('.js', '');

            AbstractAccessory[name] = require(path.join(accessoriesDir, file))(homebridge, AbstractAccessory, OverkizApi);
            inherits(AbstractAccessory[name], AbstractAccessory);
        }
    });

    return AbstractAccessory;
}

function AbstractAccessory(log, api, device) {
    this.api = api;
    this.log = log;

    this.name = device.label;
    this.deviceURL = device.deviceURL;

    this.device = device;
    
    this.services = [];
    
    var informationService = new Service.AccessoryInformation();

	var manufacturer = this._look_state(OverkizApi.State.STATE_MANUFACTURER);
	if (manufacturer != null)
		informationService.setCharacteristic(Characteristic.Manufacturer, manufacturer)

	var model = this._look_state(OverkizApi.State.STATE_MODEL);
	if (model != null)
		informationService.setCharacteristic(Characteristic.Model, model)

	var parts = this.deviceURL.split("/");
	var serial = parts[parts.length-1];
	informationService.setCharacteristic(Characteristic.SerialNumber, serial);
    this.services.push(informationService); 
}

AbstractAccessory.prototype = {
    getServices: function() {
		return this.services;
    },
    
    onStateUpdate: function(name, value) {
        /**
        *	Track here update of any state for this accessory
        *	You might then update corresponding Homekit Characteristic as follow :
        *	this.service.getCharacteristic(Characteristic.TargetPosition).updateValue(value);
        **/
    },
    
    executeCommand: function(command, callback) {
        var that = this;
        if (this.isCommandInProgress()) {
            this.api.cancelCommand(this.lastExecId, function() {});
        }

        this.api.executeCommand(this.device.deviceURL, command, function(status, error, data) {
        	if(!error) {
				if (status == ExecutionState.INITIALIZED)
					that.lastExecId = data.execId;
				if (status == ExecutionState.FAILED || status == ExecutionState.COMPLETED)
					that.log.info('[' + that.name + '] ' + command.name + ' ' + (error == null ? status : error));
            }
            callback(status, error, data);
        });
    },

    /*
    	Look for current state
    */
    _look_state: function(stateName) {
    	if(this.device.states != null) {
			for (state of this.device.states) {
				if (state.name == stateName)
					return state.value;
			}
		}
        return null;
    },

    isCommandInProgress: function() {
        return (this.lastExecId in this.api.executionCallback);
    }
}