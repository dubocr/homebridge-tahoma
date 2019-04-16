var Log, Service, Characteristic;
var Generic = require('./Generic');
var { Command, ExecutionState } = require('../overkiz-api');

class Thermostat extends Generic {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device, config);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;
		
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

        this.addService(service);

        switch(this.device.widget) {
            // EvoHome
            case 'HeatingSetPoint':
            case 'EvoHomeController':
                this.targetState.setProps({ validValues: [0,3] });
            break;

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
            // EvoHome
            case 'HeatingSetPoint':
            case 'EvoHomeController':
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        command = new Command('setOperatingMode', 'auto');
                        break;
        
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        command = new Command('setOperatingMode', 'off');
                        break;
                }
            break;

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
            this.device.executeCommand(commands, function(status, error, data) {
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
            // EvoHome
            case 'HeatingSetPoint':
            case 'EvoHomeController':
                command = new Command('setTargetTemperature', value);
            break;

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
            this.device.executeCommand(commands, function(status, error, data) {
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

    onStateUpdate(name, value) {
        var currentState = null, targetState = null, currentTemperature = null, targetTemperature = null;

        switch(name) {
            case 'core:TemperatureState':
                currentTemperature = value > 273.15 ? (value - 273.15) : value;
            break;
            case 'core:TargetTemperatureState':
                targetTemperature = value;
            break;
            case 'ramses:RAMSESOperatingModeState':
                switch(value) {
                    case 'auto':
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                    break;
                    case 'eco':
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = Characteristic.TargetHeatingCoolingState.COOL;
                    break;
                    case 'holidays':
                    case 'off':
                    default:
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                    break;
                }
            break;
        }

        if(this.currentState != null && currentState != null)
            this.currentState.updateValue(currentState);
        if(!this.isCommandInProgress() && this.targetState != null && targetState != null)
            this.targetState.updateValue(targetState);
        if(this.currentTemperature != null && currentTemperature != null)
            this.currentTemperature.updateValue(currentTemperature);
        if(!this.isCommandInProgress() && this.targetTemperature != null && targetTemperature != null)
            this.targetTemperature.updateValue(targetTemperature);
    }
}

module.exports = Thermostat