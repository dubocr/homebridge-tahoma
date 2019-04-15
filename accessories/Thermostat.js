
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

        this.currentState = this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
        this.targetState = this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState);
        this.currentTemperature = this.service.getCharacteristic(Characteristic.CurrentTemperature);
        this.targetTemperature = this.service.getCharacteristic(Characteristic.TargetTemperature);

        this.targetState.on('set', this.setTargetState.bind(this))

        this.targetTemperature.on('set', this.setTargetTemperature.bind(this));

        this.services.push(service);

        switch(this.device.widget) {
            case 'HeatingSetPoint':
            case 'EvoHomeController':
            case 'ProgrammableAndProtectableThermostatSetPoint':
            case 'ThermostatSetPoint':

            case 'SomfyThermostat':
            case 'SomfyPilotWireElectricalHeater':
            case 'SomfyPilotWireHeatingInterface':
            case 'SomfyHeatingTemperatureInterface':

            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
            case 'AtlanticPassAPCHeatPump':
            case 'AtlanticPassAPCZoneControl':
            case 'AtlanticPassAPCHeatingAndCoolingZone':
            case 'AtlanticElectricalHeater':

            case 'HitachiAirToAirHeatPump':

            // DHW
            case 'DHWSetPoint':
            case 'DomesticHotWaterProduction':
            case 'DomesticHotWaterTank':
            case 'AtlanticPassAPCDHW':
            break;
            default:
                this.targetState.setProps({ validValues: [0,1,2,3] });
                this.targetTemperature.setProps({ minValue: 15, maxValue: 26, minStep: 0.5 });
            break;
        }
    }

    setTargetState(value, callback) {
        var commands = [];
        
        switch(this.device.widget) {
            case 'HeatingSetPoint':
            case 'EvoHomeController':
            case 'ProgrammableAndProtectableThermostatSetPoint':
            case 'ThermostatSetPoint':

            case 'SomfyThermostat':
            case 'SomfyPilotWireElectricalHeater':
            case 'SomfyPilotWireHeatingInterface':
            case 'SomfyHeatingTemperatureInterface':

            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
            case 'AtlanticPassAPCHeatPump':
            case 'AtlanticPassAPCZoneControl':
            case 'AtlanticPassAPCHeatingAndCoolingZone':
            case 'AtlanticElectricalHeater':

            case 'HitachiAirToAirHeatPump':

            // DHW
            case 'DHWSetPoint':
            case 'DomesticHotWaterProduction':
            case 'DomesticHotWaterTank':
            case 'AtlanticPassAPCDHW':
            break;
        }
        if(commands.length) {
            this.executeCommand(commands, function(status, error, data) {
                switch (status) {
                    case ExecutionState.INITIALIZED: callback(error); break;
                    case ExecutionState.IN_PROGRESS: break;
                    case ExecutionState.COMPLETED:
                        if(this.device.stateless) {
                            this.currentState.updateValue(value);
                        }
                    break;
                    case ExecutionState.FAILED:
                        this.targetState.updateValue(this.currentState.value);
                    break;
                    default: break;
                }
            }.bind(this));
        }
    }
    
    setTargetTemperature(value, callback) {
        var commands = [];
        
        switch(this.device.widget) {
            case 'HeatingSetPoint':
            case 'EvoHomeController':
            case 'ProgrammableAndProtectableThermostatSetPoint':
            case 'ThermostatSetPoint':

            case 'SomfyThermostat':
            case 'SomfyPilotWireElectricalHeater':
            case 'SomfyPilotWireHeatingInterface':
            case 'SomfyHeatingTemperatureInterface':

            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
            case 'AtlanticPassAPCHeatPump':
            case 'AtlanticPassAPCZoneControl':
            case 'AtlanticPassAPCHeatingAndCoolingZone':
            case 'AtlanticElectricalHeater':

            case 'HitachiAirToAirHeatPump':

            // DHW
            case 'DHWSetPoint':
            case 'DomesticHotWaterProduction':
            case 'DomesticHotWaterTank':
            case 'AtlanticPassAPCDHW':
        }
        if(commands.length) {
            this.executeCommand(commands, function(status, error, data) {
                switch (status) {
                    case ExecutionState.INITIALIZED: callback(error); break;
                    case ExecutionState.IN_PROGRESS: break;
                    case ExecutionState.COMPLETED:
                        if(this.device.stateless) {
                            this.currentTemperature.updateValue(value);
                        }
                    break;
                    case ExecutionState.FAILED:
                        this.targetTemperature.updateValue(this.currentTemperature.value);
                    break;
                    default: break;
                }
            }.bind(this));
        }
    }
}    