var Log, Service, Characteristic, HAPServer;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class Thermostat extends AbstractService {
    constructor(homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;
        HAPServer = homebridge.hap.HAPServer;

        this.currentHumidity = null;
        this.temperature = config[this.name] || {};
        this.tempComfort = this.temperature.comfort || 19;
        this.tempEco = this.temperature.eco || 17;
		this.tempDiff = (this.tempComfort-this.tempEco);
        this.derogationDuration = this.derogationDuration || 1;

        this.service = new Service.Thermostat(device.getName());

        this.currentState = this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState);
        this.targetState = this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState);
        this.currentTemperature = this.service.getCharacteristic(Characteristic.CurrentTemperature);
        this.targetTemperature = this.service.getCharacteristic(Characteristic.TargetTemperature);

        this.targetState.on('set', this.setTargetState.bind(this))
        this.targetTemperature.on('set', this.device.postpone.bind(this,this.setTargetTemperature.bind(this)));

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
				this.targetTemperature.setProps({ perms: ['pr', 'ev'] }); // Read and Notify only (remove write)
            break;

            case 'ProgrammableAndProtectableThermostatSetPoint':
            case 'ThermostatSetPoint':
                // Nothing to do with Target
                this.targetState.setProps({ validValues: [3] });
				this.targetState.value = Characteristic.TargetHeatingCoolingState.AUTO;
				this.currentState.value = Characteristic.CurrentHeatingCoolingState.HEAT;
            break;

            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
            case 'AtlanticElectricalTowelDryer':
                // OFF, HEAT, AUTO
                this.targetState.setProps({ validValues: [0,1,3] });
                this.targetTemperature.setProps({ minValue: 0, maxValue: 28, minStep: 0.5 });
            break;

            case 'SomfyPilotWireHeatingInterface':
            case 'SomfyPilotWireElectricalHeater':
            case 'AtlanticElectricalHeater':
            case 'AtlanticPassAPCHeatPump':
            case 'AtlanticPassAPCZoneControl':
            case 'AtlanticPassAPCBoiler':
                // 3 modes only (comfort, eco, off)
                this.targetState.setProps({ validValues: [0,1,2] });
				this.targetTemperature.setProps({ perms: ['pr', 'ev'] }); // Read and Notify only (remove write)
            break;

            case 'SomfyThermostat':
                this.targetState.setProps({ minValue: 0, maxValue: 26, minStep: 0.5 });
            break;

            case 'SomfyHeatingTemperatureInterface':
                this.targetState.setProps({validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.AUTO]});
                break;
            case 'AtlanticPassAPCHeatingAndCoolingZone':
                if(this.device.parent.states['core:ProductModelNameState'] != 'R002414300') {
                    this.targetState.setProps({validValues: [Characteristic.TargetHeatingCoolingState.OFF, Characteristic.TargetHeatingCoolingState.AUTO]});
                }
                break;

            case 'AtlanticPassAPCHeatingZone':
                // 3 modes only (comfort, eco, off)
                this.targetState.setProps({ validValues: [0,1,2,3] });
            break;

            case 'HitachiAirToAirHeatPump':

            // DHW
            case 'DHWSetPoint': break; // Not used as Thermostat
            case 'DomesticHotWaterTank': break; // Not used as Thermostat

            case 'DomesticHotWaterProduction':
				if(this.device.hasCommand('setBoostMode') || this.device.hasCommand('setBoostModeDuration')) {
					this.targetState.setProps({ validValues: [0,1,3] });
				} else {
					this.targetState.setProps({ validValues: [3] });
				}
                this.targetTemperature.setProps({ minValue: 0, maxValue: 65, minStep: 1 });
            break;
            case 'AtlanticPassAPCDHW':
                this.targetTemperature.setProps({ minValue: 0, maxValue: 65, minStep: 1 });
            break;

            default:
                this.targetState.setProps({ validValues: [0,1,2,3] });
                this.targetTemperature.setProps({ minValue: 0, maxValue: 30, minStep: 0.5 });
            break;
        }
    }

    getHeatingOrCoolingState() {
        for (let state of this.device.parent.states) {
            if (state.name == 'io:PassAPCOperatingModeState') {
                return state.value;
            }
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
                // Nothing to do
                callback();
                return;
                /*switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        commands = new Command('setTargetModeAlias', 'comfort');
                        break;
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        commands = new Command('setTargetModeAlias', 'eco');
                        break;
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        commands = new Command('setTargetModeAlias', 'holidays');
                        break;
                }
            break;*/
            case 'ThermostatSetPoint':
                // Nothing to do
                callback();
                return;
                /*switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        commands = new Command('setThermostatMode', 'auto');
                        break;
                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        commands = new Command('setThermostatMode', 'heat');
                        break;
                    case Characteristic.TargetHeatingCoolingState.COOL:
                        commands = new Command('setThermostatMode', 'cool');
                        break;
                    case Characteristic.TargetHeatingCoolingState.OFF:
                        commands = new Command('setThermostatMode', 'off');
                        break;
                }
            break;*/

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

            case 'ValveHeatingTemperatureInterface':
                switch(value) {
                case Characteristic.TargetHeatingCoolingState.AUTO:
                    commands.push(new Command('exitDerogation'));
                    break;

                case Characteristic.TargetHeatingCoolingState.HEAT:
                    commands.push(new Command('setDerogation', ['comfort', 'further_notice']));
                    break;

                case Characteristic.TargetHeatingCoolingState.COOL:
                    commands.push(new Command('setDerogation', ['eco', 'further_notice']));
                    break;

                case Characteristic.TargetHeatingCoolingState.OFF:
                    commands.push(new Command('setDerogation', ['away', 'further_notice']));
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

            case 'AtlanticElectricalTowelDryer':
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        commands = new Command('setTowelDryerOperatingMode', ['internal']);
                        break;

                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        commands = new Command('setTowelDryerOperatingMode', ['external']);
                        break;

                    case Characteristic.TargetHeatingCoolingState.OFF:
                        commands = new Command('setTowelDryerOperatingMode', ['standby']);
                        break;
                }
            break;
            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
                switch(value) {
                    case Characteristic.TargetHeatingCoolingState.AUTO:
                        commands = new Command('setOperatingMode', ['auto']);
                        break;

                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        commands = new Command('setOperatingMode', ['normal']);
                        break;

                    case Characteristic.TargetHeatingCoolingState.COOL:
                        commands = new Command('setOperatingMode', ['eco']);
                        break;

                    case Characteristic.TargetHeatingCoolingState.OFF:
                        //commands = new Command('setOperatingMode', ['off']);
                        commands = new Command('setOperatingMode', ['standby']);
                        break;
                }
            break;
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

            case 'AtlanticPassAPCBoiler':
            case 'AtlanticPassAPCHeatPump':

            case 'AtlanticPassAPCHeatingZone':
        		switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
						commands.push(new Command('setHeatingOnOffState', 'on'));
						commands.push(new Command('setPassAPCHeatingMode', 'internalScheduling'));
						break;

                    case Characteristic.TargetHeatingCoolingState.HEAT:
                        commands.push(new Command('setDerogationOnOffState', 'off'));
                        commands.push(new Command('setHeatingOnOffState', 'on'));
                        commands.push(new Command('setPassAPCHeatingMode', 'comfort'));
                        break;

					case Characteristic.TargetHeatingCoolingState.COOL:
                        commands.push(new Command('setDerogationOnOffState', 'off'));
						commands.push(new Command('setHeatingOnOffState', 'on'));
						commands.push(new Command('setPassAPCHeatingMode', 'eco'));
						break;

					case Characteristic.TargetHeatingCoolingState.OFF:
						commands.push(new Command('setHeatingOnOffState', 'off'));
						//commands.push(new Command('setHeatingOnOffState', 'on'));
						//commands.push(new Command('setPassAPCHeatingMode', 'absence'));
						break;
				}
            break;

            case 'AtlanticPassAPCHeatingAndCoolingZone':
                if(this.device.parent.states['core:ProductModelNameState'] == 'R002414300') {
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
                } else {
                    let heatingOrCooling = this.getHeatingOrCoolingState();
                    switch (value) {
                        case Characteristic.TargetHeatingCoolingState.AUTO:
                            if (heatingOrCooling === 'cooling') {
                                commands.push(new Command('setCoolingOnOffState', 'on'));
                                commands.push(new Command('setPassAPCCoolingMode', 'manu'));
                            } else if (heatingOrCooling === 'heating') {
                                commands.push(new Command('setHeatingOnOffState', 'on'));
                                commands.push(new Command('setPassAPCHeatingMode', 'manu'));
                            } else {
                                commands.push(new Command('setHeatingOnOffState', 'on'));
                                commands.push(new Command('setCoolingOnOffState', 'on'));
                                commands.push(new Command('setPassAPCCoolingMode', 'manu'));
                                commands.push(new Command('setPassAPCHeatingMode', 'manu'));
                            }
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
                            if (heatingOrCooling === 'cooling') {
                                commands.push(new Command('setCoolingOnOffState', 'off'));
                                commands.push(new Command('setPassAPCHeatingMode', 'stop'));
                            } else {
                                commands.push(new Command('setHeatingOnOffState', 'off'));
                                commands.push(new Command('setPassAPCCoolingMode', 'stop'));
                            }
                            break;
                    }
                }
                break;

            case 'HitachiAirToAirHeatPump':
                commands = this.getHitachiCommands(value, this.targetTemperature.value);
            break;

            // DHW
            case 'DHWSetPoint': break; // No command supported
            case 'DomesticHotWaterTank': break; // No thermostat command, used as boost switch

            case 'DomesticHotWaterProduction':
                if(this.device.hasCommand('setBoostMode')) {
                    switch(value) {
                        case Characteristic.TargetHeatingCoolingState.AUTO:
                            commands.push(new Command('setBoostMode', 'off'));
                            commands.push(new Command('setAbsenceMode', 'off'));
                        break;
                        case Characteristic.TargetHeatingCoolingState.HEAT:
                            commands = new Command('setBoostMode', 'on');
                        break;
                        case Characteristic.TargetHeatingCoolingState.OFF:
                            commands = new Command('setAbsenceMode', 'on');
                        break;
                    }
                } else if(this.device.hasCommand('setBoostModeDuration')) {
                    switch(value) {
                        case Characteristic.TargetHeatingCoolingState.AUTO:
                            commands.push(new Command('setBoostModeDuration', 0));
                            commands.push(new Command('setAwayModeDuration', 0));
                        break;
                        case Characteristic.TargetHeatingCoolingState.HEAT:
                            commands = new Command('setBoostModeDuration', 1);
                        break;
                        case Characteristic.TargetHeatingCoolingState.OFF:
                            commands = new Command('setAwayModeDuration', 30);
                        break;
                    }
                } else if(this.device.hasCommand('setCurrentOperatingMode')) {
                    switch(value) {
                        case Characteristic.TargetHeatingCoolingState.AUTO:
                            commands.push(new Command('setCurrentOperatingMode', {"relaunch":"off","absence":"off"}));
                        break;
                        case Characteristic.TargetHeatingCoolingState.HEAT:
                            commands = new Command('setCurrentOperatingMode', {"relaunch":"on","absence":"off"});
                        break;
                        case Characteristic.TargetHeatingCoolingState.OFF:
                            commands = new Command('setCurrentOperatingMode', {"relaunch":"off","absence":"on"});
                        break;
                    }
                }
            break;

            case 'AtlanticPassAPCDHW':
        		switch(value) {
					case Characteristic.TargetHeatingCoolingState.AUTO:
						commands.push(new Command('setDHWOnOffState', 'on'));
						commands.push(new Command('setPassAPCDHWMode', 'internalScheduling'));
						break;

					case Characteristic.TargetHeatingCoolingState.HEAT:
						commands.push(new Command('setDHWOnOffState', 'on'));
						commands.push(new Command('setPassAPCDHWMode', 'comfort'));
						break;

					case Characteristic.TargetHeatingCoolingState.COOL:
						commands.push(new Command('setDHWOnOffState', 'on'));
						commands.push(new Command('setPassAPCDHWMode', 'eco'));
						break;

					case Characteristic.TargetHeatingCoolingState.OFF:
						commands.push(new Command('setDHWOnOffState', 'off'));
						break;
				}
        	break;
        }

        this.device.executeCommand(commands, function (status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    break;
                case ExecutionState.IN_PROGRESS:
                    if (this.device.widget === 'AtlanticPassAPCHeatingAndCoolingZone') {
                        let newCurrentState;
                        switch (value) {
                            case Characteristic.TargetHeatingCoolingState.AUTO:
                                let heatingOrCooling = this.getHeatingOrCoolingState();
                                if (heatingOrCooling === 'cooling') {
                                    newCurrentState = Characteristic.CurrentHeatingCoolingState.COOLING;
                                } else if (heatingOrCooling === 'heating') {
                                    newCurrentState = Characteristic.CurrentHeatingCoolingState.HEATING;
                                }
                                break;

                            case Characteristic.TargetHeatingCoolingState.HEAT:
                                newCurrentState = Characteristic.CurrentHeatingCoolingState.HEATING;
                                break;

                            case Characteristic.TargetHeatingCoolingState.COOL:
                                newCurrentState = Characteristic.CurrentHeatingCoolingState.COOLING;
                                break;

                            case Characteristic.TargetHeatingCoolingState.OFF:
                                newCurrentState = Characteristic.CurrentHeatingCoolingState.OFF;
                                break;
                        }
                        this.currentState.updateValue(newCurrentState);
                    }
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                    if (this.device.stateless) {
                        this.currentState.updateValue(value);
                    }
                    break;
                case ExecutionState.FAILED:
                    this.targetState.updateValue(this.currentState.value);
                    //this.targetState.updateValue(new Error(HAPServer.Status.SERVICE_COMMUNICATION_FAILURE));
                    break;
                default:
                    break;
            }
        }.bind(this), callback);
    }

    setTargetTemperature(value, callback) {
        var commands = [];

        switch(this.device.widget) {
            case 'EvoHomeController': // EvoHome
            case 'SomfyPilotWireHeatingInterface':
            case 'SomfyPilotWireElectricalHeater':
            case 'AtlanticElectricalHeater':
            case 'AtlanticPassAPCHeatPump':
            case 'AtlanticPassAPCZoneControl':
			break;

            case 'HeatingSetPoint': // EvoHome
            case 'ProgrammableAndProtectableThermostatSetPoint':
            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
            case 'AtlanticElectricalTowelDryer':
                commands = new Command('setTargetTemperature', value);
            break;

            case 'ThermostatSetPoint':
                //commands = new Command('setThermostatSetpoint', [value,value,value,value]);
                commands = new Command('setHeatingTargetTemperature', value);
            break;

            case 'SomfyThermostat':
            case 'ValveHeatingTemperatureInterface':
                commands = new Command('setDerogation', [value, 'further_notice']);
            break;

            case 'SomfyHeatingTemperatureInterface':
                commands = new Command(this.device.states['core:OnOffState'] == 'off' ? 'setComfortTemperature' : 'setEcoTemperature', value);
            break;

            case 'AtlanticPassAPCHeatingZone':
                if(this.targetState.value == Characteristic.TargetHeatingCoolingState.AUTO) {
                    commands.push(new Command('setDerogatedTargetTemperature', value));
                    commands.push(new Command('setDerogationTime', this.derogationDuration));
                    commands.push(new Command('setDerogationOnOffState', 'on'));
                } else {
                    // PassAPCHeatingProfileState or PassAPCHeatingModeState ?
                    if(this.targetState.value == Characteristic.TargetHeatingCoolingState.HEAT) {
                        commands.push(new Command('setComfortHeatingTargetTemperature', value));
                    } else if(this.targetState.value == Characteristic.TargetHeatingCoolingState.COOL) {
                        commands.push(new Command('setEcoHeatingTargetTemperature', value));
                    } else {
                        Log("Invalid state " + this.device.states['io:PassAPCHeatingModeState']);
                    }
                }
            break;

            case 'AtlanticPassAPCHeatingAndCoolingZone':
                if(this.device.parent.states['core:ProductModelNameState'] == 'R002414300') {
                    if(
                        this.device.states['io:PassAPCHeatingModeState'] == 'internalScheduling' ||
                        this.device.states['io:PassAPCCoolingModeState'] == 'internalScheduling'
                    ) {
            
                        commands.push(new Command('setDerogatedTargetTemperature', value));
                        commands.push(new Command('setDerogationTime', this.derogationDuration));
                        commands.push(new Command('setDerogationOnOffState', 'on'));
            
                    } else {
                        if(this.device.states['io:PassAPCHeatingModeState'] == 'comfort') {
                            commands.push(new Command('setComfortHeatingTargetTemperature', value));
                        } else if(this.device.states['io:PassAPCHeatingModeState'] == 'eco') {
                            commands.push(new Command('setEcoHeatingTargetTemperature', value));
                        } else if(this.device.states['io:PassAPCCoolingModeState'] == 'comfort') {
                            commands.push(new Command('setComfortCoolingTargetTemperature', value));
                        } else if(this.device.states['io:PassAPCCoolingModeState'] == 'eco') {
                            commands.push(new Command('setEcoCoolingTargetTemperature', value));
                        }
                    }
                } else {
                    if (this.device.states['core:ThermalConfigurationState'] == 'heatingAndCooling') {
                        let heatingOrCooling = this.getHeatingOrCoolingState();
                        if (heatingOrCooling === 'heating') {
                            commands.push(new Command('setHeatingTargetTemperature', value));
                        } else if (heatingOrCooling === 'cooling') {
                            commands.push(new Command('setCoolingTargetTemperature', value));
                        } else {
                            commands.push(new Command('setHeatingTargetTemperature', value));
                            commands.push(new Command('setCoolingTargetTemperature', value));
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

        this.device.executeCommand(commands, function (status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                    if (this.device.stateless) {
                        this.currentTemperature.updateValue(value);
                    }
                    break;
                case ExecutionState.FAILED:
                    this.targetTemperature.updateValue(this.currentTemperature.value);
                    break;
            }
        }.bind(this), callback);
    }

    onStateUpdate(name, value) {
        var currentState = null, targetState = null, currentTemperature = null, targetTemperature = null, currentHumidity = null;

        switch(this.device.widget) {
            case 'AtlanticPassAPCHeatingZone':
            case 'AtlanticPassAPCHeatingAndCoolingZone':
                [currentState, targetState, currentTemperature, targetTemperature, currentHumidity] = this.AtlanticPassAPCHeatingZoneStateUpdate(name, value);
            break;
        }
		switch(name) {
            case 'core:TemperatureState':
            case 'core:RoomTemperatureState':
            case 'core:WaterTemperatureState':
			case 'zwave:SetPointHeatingValueState':
                currentTemperature = value > 273.15 ? (value - 273.15) : value;
            break;
            case 'core:TargetTemperatureState':
            case 'core:WaterTargetTemperatureState':
            case 'core:TargetRoomTemperatureState':
                targetTemperature = value;
            break;
            case 'core:TargetDHWTemperatureState':
                currentTemperature = value;
                targetTemperature = value;
            break;
			case 'core:RelativeHumidityState':
                currentHumidity = value;
            break;

            // DomesticHotWaterProduction
            case 'io:DHWBoostModeState':
            case 'io:DHWAbsenceModeState':
            case 'core:BoostModeDurationState':
            case 'io:AwayModeDurationState':
            case 'core:HeatingStatusState':
            case 'io:OperatingModeCapabilitiesState':
            case 'core:OperatingModeState':
                if(this.device.states['io:DHWBoostModeState'] != undefined) {
                    if(this.device.states['io:DHWAbsenceModeState'] == 'on') {
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                    } else {
                        currentState = this.device.states['core:HeatingStatusState'] == 'on' ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = this.device.states['io:DHWBoostModeState'] == 'on' ? Characteristic.TargetHeatingCoolingState.HEAT : Characteristic.TargetHeatingCoolingState.AUTO;
                    }
                } else if(this.device.states['io:OperatingModeCapabilitiesState'] != undefined && this.device.states['core:OperatingModeState'] != undefined) {
                	if(this.device.states['core:OperatingModeState']['absence'] == 'on') {
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                    } else {
                    	currentState = this.device.states['io:OperatingModeCapabilitiesState']['energyDemandStatus'] == 1 ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = this.device.states['core:OperatingModeState']['relaunch'] == 'on' ? Characteristic.TargetHeatingCoolingState.HEAT : Characteristic.TargetHeatingCoolingState.AUTO;
                    }
                } else if(this.device.states['core:BoostModeDurationState'] != undefined) {
                    if(this.device.states['core:BoostModeDurationState'] > 0) {
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = Characteristic.TargetHeatingCoolingState.HEAT;
                    } else if(this.device.states['io:AwayModeDurationState'] > 0) {
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                    } else {
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                    }
                }
            break;

            // AtlanticPassAPCDHW
            case 'core:DHWOnOffState':
            case 'io:PassAPCDHWModeState':
                if(this.device.states['core:DHWOnOffState'] == 'on') {
                    var auto = ['externalScheduling', 'internalScheduling'].includes(this.device.states['io:PassAPCDHWModeState']);
                    if(this.device.states['io:PassAPCDHWModeState'] == 'comfort') {
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

            // PASS APC
            //case 'core:HeatingOnOffState':
            case 'core:CoolingOnOffState':
            case 'core:ThermalConfigurationState':
                break;

            case 'core:OnOffState':
            case 'core:HeatingOnOffState':
            case 'ovp:HeatingTemperatureInterfaceActiveModeState':
            case 'ovp:HeatingTemperatureInterfaceSetPointModeState':
                if(this.device.states['ovp:HeatingTemperatureInterfaceSetPointModeState'] != undefined) {
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
                }
            break;

            // SomfyThermostat
            case 'core:DerogationActivationState':
            case 'somfythermostat:DerogationHeatingModeState':
                var auto = this.device.states['core:DerogationActivationState'] == 'inactive';
                switch(this.device.states['somfythermostat:DerogationHeatingModeState']) {
                    case 'atHomeMode':
                    case 'geofencingMode':
                    case 'manualMode':
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.HEAT;
                    break;
                    case 'sleepingMode':
                    case 'suddenDropMode':
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.COOL;
                    break;
                    case 'awayMode':
                    case 'freezeMode':
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                    break;
                }
            break;

            case 'io:TargetHeatingLevelState':
            case 'io:CurrentHeatingModeState':
            case 'core:OperatingModeState':
                var auto = ['auto','prog', 'program'].includes(this.device.states['core:OperatingModeState']);
                // ValveHeatingTemperatureInterface
                if(this.device.states['io:CurrentHeatingModeState']) {
                    switch(this.device.states['io:CurrentHeatingModeState']) {
                        case 'manual':
                        case 'comfort':
                            currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                            targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.HEAT;
                        break;
                        case 'eco':
                            currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                            targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.COOL;
                        break;
                        case 'off':
                        case 'awayMode':
                        case 'frostprotection':
                            currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                            targetState = Characteristic.TargetHeatingCoolingState.OFF;
                        break;
                    }
                } else if(this.device.states['io:TargetHeatingLevelState']) {
                    // AtlanticHeatingInterface
                    // AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint
                    switch(this.device.states['io:TargetHeatingLevelState']) {
                        case 'boost':
                        case 'comfort':
                        case 'comfort-1':
                        case 'comfort-2':
                            currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                            targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.HEAT;
                            if(this.device.states['core:TargetTemperatureState'] === undefined) {
                                currentTemperature = this.tempComfort;
                                targetTemperature = this.tempComfort;
                            }
                        break;
                        case 'eco':
                            currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                            targetState = auto ? Characteristic.TargetHeatingCoolingState.AUTO : Characteristic.TargetHeatingCoolingState.COOL;
                            if(this.device.states['core:TargetTemperatureState'] === undefined) {
                                currentTemperature = this.tempEco;
                                targetTemperature = this.tempEco;
                            }
                        break;
                        case 'frostprotection':
                            currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                            targetState = Characteristic.TargetHeatingCoolingState.OFF;
                            if(this.device.states['core:TargetTemperatureState'] === undefined) {
                                currentTemperature = 7;
                            }
                        break;
                        default:
                            currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                            targetState = Characteristic.TargetHeatingCoolingState.OFF;
                            if(this.device.states['core:TargetTemperatureState'] === undefined) {
                                currentTemperature = 0;
                            }
                        break;
                    }
                }
            break;


            case 'ramses:RAMSESOperatingModeState':
                switch(value) {
                    case 'auto':
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                        currentTemperature = this.tempComfort;
                        targetTemperature = this.tempComfort;
                    break;
                    case 'eco':
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = Characteristic.TargetHeatingCoolingState.COOL;
                        currentTemperature = this.tempEco;
                        targetTemperature = this.tempEco;
                    break;
                    case 'holidays':
                    case 'off':
                    default:
                        currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                        targetState = Characteristic.TargetHeatingCoolingState.OFF;
                        currentTemperature = 0;
                    break;
                }
            break;
            case 'ovp:ModeChangeState':
            case 'ovp:MainOperationState':
                if(this.device.states['ovp:MainOperationState'] == 'Off' || this.device.states['ovp:MainOperationState'] == 'off') {
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
		if(this.currentHumidity != null && currentHumidity != null)
            this.currentHumidity.updateValue(currentHumidity);
    }

	merge(device) {
		switch(device.widget) {
			case 'RelativeHumiditySensor':
				this.currentHumidity = this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity);
			break;
			default:
			break;
		}
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
		Log("FROM " + this.currentState.value + '/' + this.currentTemperature.value + ' TO ' + state + '/' + temperature);

		return new Command('globalControl', [onOff, temperature, fanMode, heatMode, progMode]);
    }

    /* Atlantic Heater */
    AtlanticPassAPCHeatingZoneStateUpdate(name, value) {
        var currentState = null, targetState = null, currentTemperature = null, targetTemperature = null, currentHumidity = null;
		switch(name) {
            case 'core:TargetTemperatureState':
                targetTemperature = value;
            case 'core:WaterTargetTemperatureState':
            case 'core:TargetDHWTemperatureState':
            case 'core:TargetRoomTemperatureState':
                targetTemperature = value;
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
        }
        if(this.device.widget === 'AtlanticPassAPCHeatingAndCoolingZone') {
            if(this.device.parent.states['core:ProductModelNameState'] == 'R002414300') {
                this.computeStates();
            } else if (["core:StatusState", "io:PassAPCHeatingModeState", "core:HeatingOnOffState", "core:HeatingTargetTemperatureState", "io:PassAPCCoolingModeState", "core:CoolingOnOffState"].includes(name)) {
                let zoneMode = this.getHeatingOrCoolingState();
                if (zoneMode === 'stop') {
                    currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                } else if ((this.device.states['core:HeatingOnOffState'] == 'on' && ['auto', 'internalScheduling'].includes(this.device.states['io:PassAPCHeatingModeState']) && zoneMode === "heating") ||
                    (this.device.states['core:CoolingOnOffState'] == 'on' && ['auto', 'internalScheduling'].includes(this.device.states['io:PassAPCCoolingModeState']) && zoneMode === "cooling")) {
                    currentState = this.getHeatingOrCoolingState() === 'heating' ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;
                    targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                } else if ((this.device.states['core:HeatingOnOffState'] == 'on' && !['auto', 'internalScheduling'].includes(this.device.states['io:PassAPCHeatingModeState']) && zoneMode === "heating") ||
                    (this.device.states['core:CoolingOnOffState'] == 'on' && !['auto', 'internalScheduling'].includes(this.device.states['io:PassAPCCoolingModeState']) && zoneMode === "cooling")) {
                    currentState = this.getHeatingOrCoolingState() === 'heating' ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;
                    targetState = this.getHeatingOrCoolingState() === 'heating' ? Characteristic.TargetHeatingCoolingState.HEAT : Characteristic.TargetHeatingCoolingState.COOL;
                } else {
                    currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                    targetState = Characteristic.TargetHeatingCoolingState.OFF;
                }
                targetTemperature = this.device.states['core:HeatingTargetTemperatureState'];
            }
        } else {
            if (["core:StatusState", "io:PassAPCHeatingModeState", "core:HeatingOnOffState", "core:HeatingTargetTemperatureState", "io:PassAPCCoolingModeState", "core:CoolingOnOffState"].includes(name)) {
                let zoneMode = this.getHeatingOrCoolingState();
                if (this.device.states['core:HeatingOnOffState'] === 'off' || ['absence', 'stop'].includes(this.device.states['io:PassAPCHeatingModeState'])) {
                    currentState = Characteristic.CurrentHeatingCoolingState.OFF;
                    targetState = Characteristic.TargetHeatingCoolingState.OFF;
                    targetTemperature = this.device.states['core:TargetTemperatureState'];
                } else if (['auto', 'internalScheduling', 'externalScheduling'].includes(this.device.states['io:PassAPCHeatingModeState'])) {
                    currentState = this.device.states['io:PassAPCHeatingProfileState'] === 'comfort' ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL;
                    targetState = Characteristic.TargetHeatingCoolingState.AUTO;
                    targetTemperature = this.device.states['core:TargetTemperatureState'];
                } else {
                    if(this.device.states['io:PassAPCHeatingModeState'] === 'eco') {
                        currentState = Characteristic.CurrentHeatingCoolingState.COOL;
                        targetState = Characteristic.TargetHeatingCoolingState.COOL;
                        targetTemperature = this.device.states['core:EcoHeatingTargetTemperatureState'];
                    } else {
                        currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
                        targetState = Characteristic.TargetHeatingCoolingState.HEAT;
                        targetTemperature = this.device.states['core:ComfortHeatingTargetTemperatureState'];
                    }
                }
            }
        }

        return [currentState, targetState, currentTemperature, targetTemperature, currentHumidity];
    }

    markZoneOff() {
        this.currentState.updateValue(Characteristic.CurrentHeatingCoolingState.OFF);
        this.targetState.updateValue(Characteristic.TargetHeatingCoolingState.OFF);
    }

    markZoneOn(mode) {
        this.currentState.updateValue(mode === 'heating' ? Characteristic.CurrentHeatingCoolingState.HEAT : Characteristic.CurrentHeatingCoolingState.COOL);
        this.targetState.updateValue(Characteristic.TargetHeatingCoolingState.AUTO);
    }

    computeStates() {
        let targetState;
        let currentState;
        let targetTemperature;
        if(
            this.device.states['core:HeatingOnOffState'] == 'on' &&
            this.device.states['core:CoolingOnOffState'] == 'on'
        ) {
            targetState = Characteristic.TargetHeatingCoolingState.AUTO;
            targetTemperature = this.device.states['core:TargetTemperatureState'];
            if(this.device.states['io:PassAPCCoolingModeState'] == 'stop') {
                currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
            } else {
                currentState = Characteristic.CurrentHeatingCoolingState.COOL;
            }
        } else if(this.device.states['core:HeatingOnOffState'] == 'on') {
            targetState = Characteristic.TargetHeatingCoolingState.HEAT;
            currentState = Characteristic.CurrentHeatingCoolingState.HEAT;
            if(this.device.states['io:PassAPCHeatingProfileState'] == 'comfort') {
                targetTemperature = this.device.states['core:ComfortHeatingTargetTemperatureState'];
            } else {
                targetTemperature = this.device.states['core:EcoHeatingTargetTemperatureState'];
            }
        } else if(this.device.states['core:CoolingOnOffState'] == 'on') {
            targetState = Characteristic.TargetHeatingCoolingState.COOL;
            currentState = Characteristic.CurrentHeatingCoolingState.COOL;
            if(this.device.states['io:PassAPCHeatingProfileState'] == 'comfort') {
                targetTemperature = this.device.states['core:ComfortCoolingTargetTemperatureState'];
            } else {
                targetTemperature = this.device.states['core:EcoCoolingTargetTemperatureState'];
            }
        } else {
            targetState = Characteristic.TargetHeatingCoolingState.OFF;
            currentState = Characteristic.CurrentHeatingCoolingState.OFF;
            targetTemperature = this.device.states['core:TargetTemperatureState'];
        }
        if(this.currentState !== undefined && currentState !== undefined) {
            this.currentState.updateValue(currentState);
        }
        if(this.targetTemperature !== undefined && targetTemperature !== undefined) {
            this.targetTemperature.updateValue(targetTemperature);
        }
        if(this.targetState !== undefined && targetState !== undefined && !this.device.isCommandInProgress()) {
            this.targetState.value = targetState;
        }
    }
}

module.exports = Thermostat