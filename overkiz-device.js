var Accessories, Characteristic;

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
    Characteristic = homebridge.hap.Characteristic;
    Accessories = require('accessories/Generic')(homebridge, log);
    return { OverkizDevice, Mapper };
}

class OverkizDevice {
    constructor(device) {

        this.name = device.label;
        this.deviceURL = device.deviceURL;

        this.device = device;
        
        this.states = [];
        this.services = [];

        this.accessory = new Accessories[map.service](device.label);
    }

    getName() {
        return this.label;
    }

    getSerialNumber() {
        return this.deviceURL;
    }

    getManufacturer() {
        var manufacturer = this._look_state(OverkizApi.State.STATE_MANUFACTURER);
        if (manufacturer != null)
            return manufacturer;
        else
            return "Somfy";
    }

    getModel() {
        var manufacturer = this._look_state(OverkizApi.State.STATE_MODEL);
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
            var characNames = this.mapper.states[state.name];
            if(!Array.isArray(characNames)) {
                characNames = characNames ? [characNames] : [];
            }
            for(characName of characNames) {
                var characValue = this.stateConvert(state.name+" > "+characName, state.value);
                this.updateCharacteristic(characName, characValue);
            }
        }
    }
    
    getState(state, callback) {
        Api.requestState(this.device.deviceURL, state, callback);
    }
    
    executeCommand(commands, callback) {
            var that = this;
            var cmdName = '';
            if(Array.isArray(commands)) {
            	if(commands.length > 1)
                	cmdName = commands[0].name + " +" + (commands.length-1) + " others";
                else
                	cmdName = commands[0].name;
                for(c of commands) {
                	that.log('['+that.name+'] ' + c.name + JSON.stringify(c.parameters));
                }
            } else {
                that.log('['+that.name+'] ' + commands.name +JSON.stringify(commands.parameters));
                cmdName = commands.name;
                commands = [commands];
            }
            
            if (this.isCommandInProgress()) {
                    Api.cancelCommand(this.lastExecId, function() {});
            }
    
            var label = this.name + ' - ' + cmdName + ' - HomeKit';
            var execution = new Execution(label, this.device.deviceURL, commands);
            
            Api.executeCommand(execution, function(status, error, data) {
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
    }

    /*
        Look for current state
    */
    _look_state(stateName) {
        if(this.device.states != null) {
            for (state of this.device.states) {
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
        var that = this;
        if(this.timeout != null) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(function() {
        	todo(value, function(err) { });
        }, 2000);
        callback();
    }

    getCommands(charac, value) {
        var commands = [];
        var commandNames = this.mapper.characteristics[charac];
        if(!Array.isArray(commandNames)) {
            commandNames = commandNames ? [commandNames] : [];
        }
        for(commandName of commandNames) {
            var command = new command(commandName);
            command.parameters = this.commandConvert(charac+" > "+commandName, value);
            commands.push(command);
        }
        return commands;
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

    updateCharacteristic(name, value) {
        this.log("Characteristic " + name + " updated to " + value);
    }

    commandConvert(name, value) {
        switch(name) {
            case "TargetHeatingCoolingState > setOnOff":
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO: return ['on'];
                    case Characteristic.TargetHeatingCoolingState.HEAT: return ['on'];
                    case Characteristic.TargetHeatingCoolingState.COOL: return ['on'];
                    case Characteristic.TargetHeatingCoolingState.OFF: return ['on'];
                }
                

            case "TargetTemperature > setActiveMode":
                return [value];
            
            case "TargetDoorState > setClosure":
                return [value];
        }
    }

    stateConvert() {
        switch(name) {
            case "core:CO2ConcentrationState > CarbonDioxideLevel":
                return value - 273.15;
            
            case "core:OpenClosedPedestrianState > CurrentDoorState":
                switch(value) {
                    case "pedestrian": return Characteristic.CurrentDoorState.STOPPED;
                    case "closed": return Characteristic.CurrentDoorState.CLOSED;
                    default: 
                    case "open":
                    case "unknown": return Characteristic.CurrentDoorState.OPEN;
                }
            case "core:OpenClosedPedestrianState > TargetDoorState":
                switch(value) {
                    case "pedestrian": return Characteristic.TargetDoorState.OPEN;
                    case "closed": return Characteristic.TargetDoorState.CLOSED;
                    default: 
                    case "open":
                    case "unknown": return Characteristic.TargetDoorState.OPEN;
                }
        }
    }

    getInstance(device) {
        inherits(device, OverkizDevice);
        device.mapper = { service: null, states: {}, characteristics: {} };

        switch(device.uiClass) {
            
            case "AirSensor":
            device.mapper.service = "AirQualitySensor";
            device.mapper.states = { "core:CO2ConcentrationState": "CarbonDioxideLevel" };
            break;
            
            case "HeatinSystem":
            device.mapper.service = "Thermostat";
            device.mapper.characteristics = { 
                "TargetHeatingCoolingState": "setOperatingMode",
                "TargetTemperature": "setTargetTemperature"
            };
            device.mapper.states = { 
                "io:TargetHeatingLevelState": "TargetHeatingCoolingState",
                "ramses:RAMSESOperatingModeState" : ["CurrentHeatingCoolingState", "TargetHeatingCoolingState"],
                "core:TemperatureState": "CurrentTemperature",
                "core:TargetTemperatureState" : "TargetTemperature"
            };
            break;
            
            case "Awning":
            case "Window":
            device.mapper.service = "Window";
            device.mapper.characteristics = { "On": "setHeatingLevel" };
            device.mapper.states = { "io:TargetHeatingLevelState": "On" };
            break;

        }

        switch(device.widget) {
            
            case "SomfyPilotWireElectricalHeater":
            device.mapper.service = "Switch";
            device.mapper.characteristics = { "On": "setHeatingLevel" };
            break;
            
            case "AtlanticPassAPCZoneControl":
            case "AtlanticPassAPCHeatPump":
            device.mapper.service = "Switch";
            device.mapper.characteristics = { "On": "setPassAPCOperatingMode"};
            break;

        }

        var config = config[device.mapper.service] || {};
        device.accessory = new Accessories[device.mapper.service](device, config);
        return device;
    }
}
