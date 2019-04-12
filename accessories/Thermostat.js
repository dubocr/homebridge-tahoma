
module.exports = function(homebridge, log, api) {
    Generic = require('Generic')(homebridge, log, api);
    Characteristic = homebridge.hap.Characteristic;
    return Thermostat;
}

class Thermostat extends Generic {
    constructor (device, config) {
        super(device, config);
        this.currentHumidity = null;
        this.temperature = config[this.name] || {};
        this.tempComfort = this.temperature.comfort || 19;
        this.tempEco = this.temperature.eco || 17;
        this.derogationDuration = this.derogationDuration || 1;
        
        this.service = new Service.Thermostat(device.getName());

        this.service.getCharacteristic(Characteristic.TargetTemperature)
            .on('set', this.setTargetTemperature.bind(this, "TargetTemperature"));
        
            this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
        this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on('set', this.sendCommands.bind(this, "TargetHeatingCoolingState"))
            .setProps({ minValue: 15, maxValue: 26, minStep: 0.5 });

        this.service = service;
        this.services.push(service);
    }
    
    setTargetTemperature(value, callback) {
        var commands = this.getCommands("TargetTemperature", value);        
        this.executeCommand(commands, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                    if(this.autoApply) {
                        this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(value);
                    }
                case ExecutionState.FAILED:
                    break;
                default:
                    break;
            }
        });
    }

    setTargetHeatingCoolingState(value, callback) {
        var commands = this.getCommands("TargetHeatingCoolingState", value);        
        this.executeCommand(commands, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                    if(this.device.stateless) {
                        this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(value);
                    }
                case ExecutionState.FAILED:
                    this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).value);
                    break;
                default:
                    break;
            }
        });
    }
}    