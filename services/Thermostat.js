var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class Thermostat extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
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

        switch(this.device.widget) {
            // EvoHome
            case 'HeatingSetPoint':
                this.targetState.setProps({ validValues: [3] });
				this.targetState.value = Characteristic.TargetHeatingCoolingState.AUTO;
				this.currentState.value = Characteristic.CurrentHeatingCoolingState.HEAT;
				this.targetTemperature.setProps({ minValue: 0, maxValue: 30, minStep: 1 });
            break;
            case 'EvoHomeController':
                this.targetState.setProps({ validValues: [0,3] });
				this.targetTemperature.setProps({ minValue: 0, maxValue: this.tempComfort, minStep: 1 });
				this.targetTemperature.value = this.tempComfort;
				this.currentTemperature.value = this.tempComfort;
            break;

            case 'ProgrammableAndProtectableThermostatSetPoint':
            case 'ThermostatSetPoint':
                // Nothing to do with Target
                this.targetState.setProps({ validValues: [] });
            break;

            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
            case 'SomfyPilotWireElectricalHeater':
            case 'AtlanticElectricalHeater':
                // 3 modes only (comfort, eco, off)
                this.targetState.setProps({ validValues: [0,1,2] });
                this.targetTemperature.setProps({ minValue: 0, maxValue: this.tempComfort, minStep: 1 });
            break;

            case 'SomfyThermostat':
                this.targetState.setProps({ minValue: 15, maxValue: 26, minStep: 0.5 });
            break;

            case 'SomfyPilotWireHeatingInterface':
            case 'SomfyHeatingTemperatureInterface':

            case 'AtlanticPassAPCHeatPump':
            case 'AtlanticPassAPCZoneControl':
            case 'AtlanticPassAPCHeatingAndCoolingZone':
                // 3 modes only (comfort, eco, off)
                this.targetState.setProps({ validValues: [0,1,2] });
            break;

            case 'HitachiAirToAirHeatPump':

            // DHW
            case 'DHWSetPoint': break; // Not used as Thermostat
            case 'DomesticHotWaterTank': break; // Not used as Thermostat

            case 'DomesticHotWaterProduction':
                this.targetState.setProps({ validValues: [1,2,3] });
                this.targetTemperature.setProps({ minValue: 0, maxValue: 50, minStep: 1 });
            break;
            case 'AtlanticPassAPCDHW':
                this.targetTemperature.setProps({ minValue: 0, maxValue: 50, minStep: 1 });
            break;
			
            default:
                this.targetState.setProps({ validValues: [0,1,2,3] });
                this.targetTemperature.setProps({ minValue: 0, maxValue: 30, minStep: 0.5 });
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
                        commands = new Command('setOperatingMode', 'auto');
                        break;
        
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        commands = new Command('setOperatingMode', 'off');
                        break;
                }
            break;

            case 'ProgrammableAndProtectableThermostatSetPoint':
            case 'ThermostatSetPoint':
                // Nothing to do
            break;

            case 'SomfyThermostat':
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        commands.push(new Command('exitDerogation'));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        commands.push(new Command('setDerogation', ['atHomeMode', 'further_notice']));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        commands.push(new Command('setDerogation', ['sleepingMode', 'further_notice']));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        commands.push(new Command('setDerogation', ['awayMode', 'further_notice']));
                        break;
                }
            break;

            case 'SomfyPilotWireHeatingInterface':
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        if(this.device.states['core:OnOffState'] == 'off')
                            commands.push(new Command('setOnOff', 'on'));
                        commands.push(new Command('setActiveMode', 'auto'));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        if(this.device.states['core:OnOffState'] == 'off')
                            commands.push(new Command('setOnOff', 'on'));
                        commands.push(new Command('setSetPointMode', 'comfort'));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        if(this.device.states['core:OnOffState'] == 'off')
                            commands.push(new Command('setOnOff', 'on'));
                        commands.push(new Command('setSetPointMode', 'eco'));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        commands.push(new Command('setOnOff', 'off'));
                        break;
                    
                    default:
                        callback("Bad command");
                        break;
                }
            break;

            case 'SomfyHeatingTemperatureInterface':
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        if(this.device.states['core:OnOffState'] == 'off')
                            commands.push(new Command('setOnOff', ['on']));
                        commands.push(new Command('setActiveMode', ['auto']));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        if(this.device.states['core:OnOffState'] == 'off')
                            commands.push(new Command('setOnOff', ['on']));
                        commands.push(new Command('setManuAndSetPointModes', ['comfort']));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        if(this.device.states['core:OnOffState'] == 'off')
                            commands.push(new Command('setOnOff', ['on']));
                        commands.push(new Command('setManuAndSetPointModes', ['eco']));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        commands.push(new Command('setOnOff', ['off']));
                        break;
                    
                    default:
                        callback("Bad command");
                        break;
                }
            break;

            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
            case 'SomfyPilotWireElectricalHeater':
            case 'AtlanticElectricalHeater':
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        commands = new Command('setHeatingLevel', ['comfort']);
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        commands = new Command('setHeatingLevel', ['comfort']);
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        commands = new Command('setHeatingLevel', ['eco']);
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        commands = new Command('setHeatingLevel', ['off']);
                        break;
                }
            break;


            case 'AtlanticPassAPCHeatPump':
            case 'AtlanticPassAPCZoneControl':
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        commands.push(new Command('setPassAPCOperatingMode', 'heating'));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        commands.push(new Command('setPassAPCOperatingMode', 'heating'));
                        break;
                    
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        commands.push(new Command('setPassAPCOperatingMode', 'cooling'));
                        break;
                        
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        commands.push(new Command('setPassAPCOperatingMode', 'stop'));
                        break;
                    
                    default:
                        callback("Bad command");
                        break;
                }
            break;

            case 'AtlanticPassAPCHeatingAndCoolingZone':
        		switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
						commands.push(new Command('setHeatingOnOffState', 'on'));
						commands.push(new Command('setCoolingOnOffState', 'on'));
						break;
					
					case Characteristic.TargetHeatingCoolingState.HEAT:
						commands.push(new Command('setHeatingOnOffState', 'on'));
						commands.push(new Command('setCoolingOnOffState', 'off'));
						break;
					
					case Characteristic.TargetHeatingCoolingState.COOL:
						commands.push(new Command('setHeatingOnOffState', 'off'));
						commands.push(new Command('setCoolingOnOffState', 'on'));
						break;
					
					case Characteristic.TargetHeatingCoolingState.OFF:
						commands.push(new Command('setHeatingOnOffState', 'off'));
						commands.push(new Command('setCoolingOnOffState', 'off'));
						break;
				}
        	break;

            case 'HitachiAirToAirHeatPump':
                commands = this.getHitachiCommands(value, this.targetTemperature.value);
            break;

            // DHW
            case 'DHWSetPoint': break; // No command supported
            case 'DomesticHotWaterTank': break; // No thermostat command, used as boost switch
            
            case 'DomesticHotWaterProduction':
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        commands = new Command('setDHWMode', 'autoMode');
                    break;
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        commands = new Command('setDHWMode', 'manualEcoInactive');
                    break;
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        commands = new Command('setDHWMode', 'manualEcoActive');
                    break;
                }
            break;
            case 'AtlanticPassAPCDHW':
                commands = new Command('setDHWOnOffState', value == Characteristic.TargetHeatingCoolingState.OFF ? 'off' : 'on');
            break;
        }
		
		this.device.executeCommand(commands, function(status, error, data) {
			switch (status) {
				case ExecutionState.INITIALIZED:
					callback(error);
				break;
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
    
    setTargetTemperature(value, callback) {
        var commands = [];
        
        switch(this.device.widget) {
            case 'EvoHomeController': // EvoHome
			break;
			
            case 'HeatingSetPoint': // EvoHome
            case 'ProgrammableAndProtectableThermostatSetPoint':
            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
                commands = new Command('setTargetTemperature', value);
            break;

            case 'ThermostatSetPoint':
                commands = new Command('setThermostatSetpoint', [value,value,value,value]);
            break;

            case 'SomfyThermostat':
                commands = new Command('setDerogation', [value, 'further_notice']);
            break;

            case 'SomfyHeatingTemperatureInterface':
                command = new Command(this.device.states['core:OnOffState'] == 'off' ? 'setComfortTemperature' : 'setEcoTemperature', value);
            break;

            case 'SomfyPilotWireHeatingInterface':
            case 'SomfyPilotWireElectricalHeater':
            case 'AtlanticElectricalHeater':
            break;

            case 'AtlanticPassAPCHeatPump':
            case 'AtlanticPassAPCZoneControl':
            break;
            
            case 'AtlanticPassAPCHeatingAndCoolingZone':
				if(this.device.states['core:ThermalConfigurationState'] == 'heatingAndCooling') {
					commands.push(new Command('setDerogatedTargetTemperature', value));
					commands.push(new Command('setDerogationOnOffState', 'on'));
					commands.push(new Command('setDerogationTime', this.derogationDuration));
				} else if(this.device.states['core:ThermalConfigurationState'] == 'heating') {
					if(['auto', 'externalScheduling', 'internalScheduling'].includes(this.device.states['io:PassAPCHeatingModeState'])) {
						commands.push(new Command('setDerogatedTargetTemperature', value));
						commands.push(new Command('setDerogationOnOffState', 'on'));
						commands.push(new Command('setDerogationTime', this.derogationDuration));
					} else {
						if(this.device.states['io:PassAPCHeatingProfileState'] == 'comfort') {
							commands.push(new Command('setComfortHeatingTargetTemperature', value));
						} else if(this.device.states['io:PassAPCHeatingProfileState'] == 'eco') {
							commands.push(new Command('setEcoHeatingTargetTemperature', value));
						} else {
							Log("Invalid state " + this.device.states['io:PassAPCHeatingProfileState']);
							callback("Invalid state");
						}
					}
				} else if(this.device.states['core:ThermalConfigurationState'] == 'cooling') {
					if(['auto', 'externalScheduling', 'internalScheduling'].includes(this.device.states['io:PassAPCCoolingModeState'])) {
						commands.push(new Command('setDerogatedTargetTemperature', value));
						commands.push(new Command('setDerogationOnOffState', 'on'));
						commands.push(new Command('setDerogationTime', [this.derogationDuration]));
					} else {
						if(this.device.states['io:PassAPCCoolingProfileState'] == 'comfort') {
							commands.push(new Command('setComfortCoolingTargetTemperature', value));
						} else if(this.device.states['io:PassAPCCoolingProfileState'] == 'eco') {
							commands.push(new Command('setEcoCoolingTargetTemperature', value));
						} else {
							Log("Invalid state " + this.device.states['io:PassAPCCoolingProfileState']);
							callback("Invalid state");
						}
					}
				}
			break;

            case 'HitachiAirToAirHeatPump':
                commands = this.getHitachiCommands(this.targetState.value, value);
            break;

            // DHW
            case 'DomesticHotWaterTank': break; // Not used as Thermostat
            case 'DHWSetPoint': break; // Not used as Thermostat
            
            case 'DomesticHotWaterProduction':
                commands = new Command('setHaltedTargetTemperature', value);
            break;

            case 'AtlanticPassAPCDHW':
        		commands = new Command('setComfortTargetDHWTemperature', value);
        	break;
        }
		
		this.device.executeCommand(commands, function(status, error, data) {
			switch (status) {
				case ExecutionState.INITIALIZED:
					callback(error);
				break;
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

    onStateUpdate(name, value) {
        var currentState = null, targetState = null, currentTemperature = null, targetTemperature = null;

        switch(name) {
            case 'core:TemperatureState':
                currentTemperature = value > 273.15 ? (value - 273.15) : value;
            break;
            case 'core:TargetTemperatureState':
            case 'core:TargetDHWTemperatureState':
                targetTemperature = value;
            break;

            // DomesticHotWaterProduction
            case 'io:DHWModeState':
                switch(value) {
                    case 'autoMode':
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                    break;
                    case 'manualEcoActive':
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = Characteristic.TargetHeatingCoolingState.COOL;
                    break;
                    case 'manualEcoInactive':
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = Characteristic.TargetHeatingCoolingState.HEAT;
                    break;
                }
            break;

            // AtlanticPassAPCDHW
            case 'core:DHWOnOffState':
            case 'io:PassAPCDHWModeState':
                if(this.device.states['core:DHWOnOffState'] == 'on') {
                    var auto = ['externalScheduling', 'internalScheduling'].includes(this.device.states['io:PassAPCDHWModeState']);
                    if(this.device.states['io:PassAPCDHWProfileState'] == 'comfort') {
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.HEAT;
                    } else {
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO: Characteristic.TargetHeatingCoolingState.COOL;
                    }
                } else {
                    currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                    targetState = Characteristic.TargetHeatingCoolingState.OFF;
                }
            break;

            // AtlanticHeatingInterface
            case 'io:TargetHeatingLevelState':
                switch(value) {
                    case 'boost':
                    case 'comfort':
                    case 'comfort-1':
                    case 'comfort-2':
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = Characteristic.TargetHeatingCoolingState.HEAT;
                        currentTemperature = this.tempComfort;
                        targetTemperature = this.tempComfort;
                    break;
                    case 'eco':
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = Characteristic.TargetHeatingCoolingState.COOL;
                        currentTemperature = this.tempEco;
                        targetTemperature = this.tempEco;
                    break;
                    case 'frostprotection':
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                        currentTemperature = 7;
                        targetTemperature = 7;
                    break;
                    default:
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                        currentTemperature = 0;
                        targetTemperature = 0;
                    break;
                }
            break;

            // PASS APC
            case 'core:HeatingOnOffState':
			case 'core:CoolingOnOffState':
			case 'core:ThermalConfigurationState':
                if(this.device.states['core:HeatingOnOffState'] == 'on') {
                    currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                } else if(this.device.states['core:CoolingOnOffState'] == 'on') {
                    currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                } else {
                    currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                }
            
                if(this.device.states['core:HeatingOnOffState'] == 'on' || this.device.states['core:CoolingOnOffState'] == 'on') {
                    switch(this.device.states['core:ThermalConfigurationState']) {
                        case 'heating':
                            targetState = Characteristic.TargetHeatingCoolingState.HEAT;
                        break;
                        case 'cooling':
                            targetState = Characteristic.TargetHeatingCoolingState.COOL;
                        break;
                        case 'heatingAndCooling':
                            targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                        break;
                    }
                }
            break;

            case 'core:OnOffState':
            case 'core:HeatingOnOffState':
            case 'ovp:HeatingTemperatureInterfaceActiveModeState':
            case 'ovp:HeatingTemperatureInterfaceSetPointModeState':
                if(this.device.states['core:OnOffState'] == 'on' || this.device.states['core:HeatingOnOffState'] == 'on') {
                    var auto = this.device.states['ovp:HeatingTemperatureInterfaceActiveModeState'] == 'auto';
                    if(this.device.states['ovp:HeatingTemperatureInterfaceSetPointModeState'] == 'comfort') {
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.HEAT;
                    } else {
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO: Characteristic.TargetHeatingCoolingState.COOL;
                    }
                } else {
                    currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                    targetState = Characteristic.TargetHeatingCoolingState.OFF;
                }
            break;

            // SomfyThermostat
            case 'core:DerogationActivationState':
            case 'somfythermostat:DerogationHeatingModeState':
                var auto = this.device.states['core:DerogationActivationState'] == 'inactive';
                switch(this.device.states['somfythermostat:DerogationHeatingModeState']) {
                    case'atHomeMode':
                    case'geofencingMode':
                    case'manualMode':
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.HEAT;
                    break;
                    case'sleepingMode':
                    case'suddenDropMode':
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.COOL;
                    break;
                    case'awayMode':
                    case'freezeMode':
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                    break;
                }
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
            case 'ovp:ModeChangeState':
            case 'ovp:MainOperationState':
                if(this.device.states['ovp:MainOperationState'] == 'off') {
                    currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                    targetState = Characteristic.TargetHeatingCoolingState.OFF;
                } else {
                    switch(this.device.states['ovp:ModeChangeState'].toLowerCase()) {
                        case "auto cooling":
                            currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                            targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                        break;
                        case "auto heating":
                            currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                            targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                        break;
                        case "cooling":
                            currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                            targetState = Characteristic.TargetHeatingCoolingState.COOL;
                        break;
                        case "heating":
                            currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                            targetState = Characteristic.TargetHeatingCoolingState.HEAT;
                        break;
                    }
                }
            break;
            case 'ovp:RoomTemperatureState':
                currentTemperature = typeof value === 'string' ? parseInt(value.replace(" °C").replace(" °F")) : value;
            break;
            case 'ovp:TemperatureChangeState':
                targetTemperature = typeof value === 'string' ? parseInt(value.replace(" °C").replace(" °F")) : value;
                if(targetTemperature <= 5) targetTemperature += this.currentTemperature.value;
            break;
        }

        if(this.currentState != null && currentState != null)
            this.currentState.updateValue(currentState);
        if(!this.device.isCommandInProgress() && this.targetState != null && targetState != null)
            this.targetState.updateValue(targetState);
        if(this.currentTemperature != null && currentTemperature != null)
            this.currentTemperature.updateValue(currentTemperature);
        if(!this.device.isCommandInProgress() && this.targetTemperature != null && targetTemperature != null)
            this.targetTemperature.updateValue(targetTemperature);
    }

    /* Device specific */
    getHitachiCommands(state, temperature) {
		var onOff = "on";
		var fanMode = "auto";
		var progMode = "manu";
		var heatMode = "auto";
		var autoTemp = Math.trunc(Math.max(Math.min(temperature - this.currentTemperature.value, 5), -5));

		switch(state) {
	
			case Characteristic.TargetHeatingCoolingState.OFF:
				onOff = "off";
				switch(this.currentState.value) {
					case Characteristic.CurrentHeatingCoolingState.AUTO:
						heatMode = "auto";
						temperature = autoTemp;
						break;
					case Characteristic.CurrentHeatingCoolingState.HEAT:
						heatMode = "heating";
						break;
					case Characteristic.CurrentHeatingCoolingState.COOL:
						heatMode = "cooling";
						break;
					default:
						temperature = autoTemp;
						break;
				}
				break;
	
			case Characteristic.TargetHeatingCoolingState.HEAT:
				heatMode = "heating";
				break;
	
			case Characteristic.TargetHeatingCoolingState.COOL:
				 heatMode = "cooling";
				break;
	
			case Characteristic.TargetHeatingCoolingState.AUTO:
				heatMode = "auto";
				temperature = autoTemp;
				break;
	
			default:
				temperature = autoTemp;
				break;
		}
		
		temperature = Math.round(temperature);
		this.log("FROM " + this.currentState.value + '/' + this.currentTemperature.value + ' TO ' + state + '/' + temperature);

		return new Command('globalControl', [onOff, temperature, fanMode, heatMode, progMode]);
    }
}

module.exports = Thermostat