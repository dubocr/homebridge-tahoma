var Api, Log, Characteristic;

var path = require('path');
var fs = require('fs');

var inherits = function (ctor, superCtor) {

    if (ctor === undefined || ctor === null)
        throw new TypeError('The constructor to "inherits" must not be null or undefined');

    if (superCtor === undefined || superCtor === null)
        throw new TypeError('The super constructor to "inherits" must not be null or undefined');

    if (superCtor.prototype === undefined)
        throw new TypeError('The super constructor to "inherits" must have a prototype');

    ctor.super_ = superCtor;
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}

module.exports = function(homebridge, log, api) {
    Api = api;
    Log = log;
    Characteristic = homebridge.hap.Characteristic;
    return OverkizDevice;
}

class OverkizDevice {
    constructor(device) {
		Object.assign(this, device);
		
        this.name = device.label;
        this.deviceURL = device.deviceURL;

        this.device = device;
        
        this.states = [];
        this.services = [];
    }

    getName() {
        return this.label;
    }

    getSerialNumber() {
        return this.deviceURL;
    }

    getManufacturer() {
        var manufacturer = this._look_state(Api.State.STATE_MANUFACTURER);
        if (manufacturer != null)
            return manufacturer;
        else
            return "Somfy";
    }

    getModel() {
        var manufacturer = this._look_state(Api.State.STATE_MODEL);
        if (manufacturer != null)
            return manufacturer;
        else
            return this.uiClass;
    }
    
    onStatesUpdate(states) {
        if(states == null) return;

        for (state of states) {
            this.states[state.name] = state.value;
        }

        for (state of states) {
            this.onStateUpdate(state.name, state.value);
        }
    }
    
    getState(state, callback) {
        Api.Api.requestState(this.device.deviceURL, state, callback);
    }
    
    executeCommand(commands, callback) {
            var cmdName = '';
            if(commands == null) {
                Log("No target command for " + this.name);
                callback("No target command for " + this.name);
            } else if(Array.isArray(commands)) {
            	if(commands.length == 0) {
                    Log("No target command for " + this.name);
                    callback("No target command for " + this.name);
                } else if(commands.length > 1) {
                    cmdName = commands[0].name + " +" + (commands.length-1) + " others";
                } else {
                    cmdName = commands[0].name;
                }
                for(c of commands) {
                	Log('['+this.name+'] ' + c.name + JSON.stringify(c.parameters));
                }
            } else {
                Log('['+this.name+'] ' + commands.name +JSON.stringify(commands.parameters));
                cmdName = commands.name;
                commands = [commands];
            }
            
            if (this.isCommandInProgress()) {
                    Api.cancelCommand(this.lastExecId, function() {});
            }
    
            var label = this.name + ' - ' + cmdName + ' - HomeKit';
            var execution = new Execution(label, this.device.deviceURL, commands);
            
            Api.Api.executeCommand(execution, function(status, error, data) {
            	if (status == ExecutionState.INITIALIZED) {
                    if(error) {
                    	// API Error
                    	this.updateReachability(false);
                	} else {
                		this.lastExecId = data.execId;
                    }
                }
                
                if(status == ExecutionState.FAILED || status == ExecutionState.COMPLETED)
                    Log('[' + this.name + '] ' + cmdName + ' ' + (error == null ? status : error));
                else
                    Log.debug('[' + this.name + '] ' + cmdName + ' ' + (error == null ? status : error));

                callback(status, error, data);
            }.bind(this));
    }

    /*
        Look for current state
    */
    _look_state(stateName) {
        if(this.device.states != null) {
            for (var state of this.device.states) {
                if (state.name == stateName)
                    return state.value;
            }
        }
        return null;
    }

    isCommandInProgress() {
        return (this.lastExecId in Api.executionCallback);
    }
    
    postpone(todo, value, callback) {
        if(this.timeout != null) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(function() {
        	todo(value, function(err) { });
        }, 2000);
        callback();
    }

    hasCommand(name) {
        for(command of device.definition.commands) {
            if(command.commandName == name)	{
                return true;
            }
        }
        return false;
    }
    
    merge(device) {
        switch(this.widget) {
            case 'AtlanticPassAPCZoneControl': if(device.widget != 'AtlanticPassAPCHeatingAndCoolingZone') return;
            case 'AtlanticPassAPCHeatingAndCoolingZone': if(device.widget != 'TemperatureSensor') return;
        }
        if(this.parent != null) {
            this.parent.merge(device);
        }
        device.parent = this;
        device.accessory = this.accessory;
    }

    static getInstance(device) {
        inherits(device, OverkizDevice);
        device.mapper = { service: null };

        switch(device.uiClass) {
            
            case "AirSensor":
            device.mapper.service = "AirQualitySensor";
            break;

            case "ContactSensor":
            case "WindowHandle":
            device.mapper.service = "ContactSensor";
            break;

            case "DoorLock":
            device.mapper.service = "LockMechanism";
            break;

            case "Fan":
            device.mapper.service = "Fan";
            break;

            case "Light":
            device.mapper.service = "Lightbulb";
             break;
            
            case "HeatinSystem":
            device.mapper.service = "Thermostat";
            break;

            case "HumiditySensor":
            device.mapper.service = "HumiditySensor";
            break;
            
            case "LightSensor":
            device.mapper.service = "LightSensor";
            break;

            case "OccupancySensor":
            device.mapper.service = "OccupancySensor";
            break;
            
            case "Awning":
            case "Window":
            device.mapper.service = "Window";
            break;

            case "Pergola":
            device.mapper.service = "Window";
            config[device.mapper.service].blindMode = true;
            break;

            case "OnOff":
            device.mapper.service = "Switch";
            break;

            case "Gate":
            device.mapper.service = "GarageDoorOpener";
            break;

        }

        switch(device.widget) {
            
            case "SomfyPilotWireElectricalHeater":
            device.mapper.service = "Switch";
            break;
            
            case "AtlanticPassAPCZoneControl":
            case "AtlanticPassAPCHeatPump":
            device.mapper.service = "Switch";
            break;

            case "DimmerOnOff":
            device.mapper.service = "Lightbulb";
            break;

            case 'StatelessAlarmController':
            device.stateless = true;
            break;

            case 'UpDownHorizontal':
            device.stateless = true;
            break;
        }

        var config = config[device.mapper.service] || {};
        //device.accessory = new Accessories[device.mapper.service](device, config);
        return device;
    }
}
