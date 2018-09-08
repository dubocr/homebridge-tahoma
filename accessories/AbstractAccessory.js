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
	Accessory = homebridge.platformAccessory;
	UUIDGen = homebridge.hap.uuid;
	
	inherits(AbstractAccessory, Accessory);

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

    // manufacturer
    var manufacturer = this._look_state(OverkizApi.State.STATE_MANUFACTURER);
    if (manufacturer != null)
        informationService.setCharacteristic(Characteristic.Manufacturer, manufacturer);
    else
        informationService.setCharacteristic(Characteristic.Manufacturer, "Somfy");
    
    // model
    var model = this._look_state(OverkizApi.State.STATE_MODEL);
    if (model != null)
        informationService.setCharacteristic(Characteristic.Model, model);
    else
        informationService.setCharacteristic(Characteristic.Model, device.uiClass); // or device.widget or api.service
    
    // parts
    var parts = this.deviceURL.split("/");
    
    //serial
    var serial = parts[parts.length-1];
    informationService.setCharacteristic(Characteristic.SerialNumber, serial);
    this.services.push(informationService);
    
    this.displayName = device.label;
    this.UUID = UUIDGen.generate(this.displayName); // serial
    //this.log('New Device : ' + this.displayName + ' ID:' + serial);
}

AbstractAccessory.prototype = {
    getServices: function() {
            return this.services;
    },
    
    onStateUpdate: function(name, value) {
        /**
        *    Track here update of any state for this accessory
        *    You might then update corresponding Homekit Characteristic as follow :
        *    this.service.getCharacteristic(Characteristic.TargetPosition).updateValue(value);
        **/
    },
    
    getState: function(state, callback) {
        this.api.requestState(this.device.deviceURL, state, callback);
    },
    
    executeCommand: function(commands, callback) {
            var that = this;
            var cmdName = '';
            if(Array.isArray(commands)) {
                cmdName = "Bulk commands";
            } else {
                that.log('['+that.name+'] ' + commands.name +JSON.stringify(commands.parameters));
                cmdName = commands.name;
                commands = [commands];
            }
            
            if (this.isCommandInProgress()) {
                    this.api.cancelCommand(this.lastExecId, function() {});
            }
    
            var label = cmdName + ' ' + this.name;
            var execution = new Execution(label, this.device.deviceURL, commands);
            
            this.api.executeCommand(execution, function(status, error, data) {
            	if (status == ExecutionState.INITIALIZED) {
                    if(error) {
                    	// API Error
                    	that.updateReachability(false);
                	} else {
                		that.lastExecId = data.execId;
                    }
                }
                
                if(status == ExecutionState.FAILED || status == ExecutionState.COMPLETED)
                    that.log('[' + that.name + '] ' + cmdName + ' ' + (error == null ? status : error));
                else
                    that.log.debug('[' + that.name + '] ' + cmdName + ' ' + (error == null ? status : error));

                callback(status, error, data);
            });
    },
    
    /*
        Merge with another device
    */
    merge: function(device) {
    
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
    },
    
    postpone: function(todo, value, callback) {
        var that = this;
        if(this.timeout != null) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(function() {
        	todo(value, function(err) { });
        }, 2000);
        callback();
    }
}
