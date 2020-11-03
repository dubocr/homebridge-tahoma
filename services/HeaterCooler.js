var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var {Command, ExecutionState} = require('../overkiz-api');

class HeaterCooler extends AbstractService {
    constructor(homebridge, log, device, config, platform) {
        super(homebridge, log, device);
        Log = log;
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;

        this.platform = platform;
        this.service = new Service.HeaterCooler(device.getName());
        this.currentState = this.service.getCharacteristic(Characteristic.CurrentHeaterCoolerState);
        this.activeState = this.service.getCharacteristic(Characteristic.Active);
        this.targetState = this.service.getCharacteristic(Characteristic.TargetHeaterCoolerState);
        this.currentTemperature = this.service.getCharacteristic(Characteristic.CurrentTemperature);
        this.targetState.on('set', this.setStatus.bind(this));
        this.activeState.on('set', this.setActive.bind(this)).on('get', this.getActive.bind(this));

        this.service.getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .on('get', function (callback) {
                callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
            });

        this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', function (callback) {
                callback(null, 50);
            })


        this.heatingThresholdTemperature = this.service.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .setProps({
                minValue: 16,
                maxValue: 30,
                minStep: 0.5,
                //perms: [Characteristic.Perms.READ]
            })
            .on('get', this.getHeatingTemperature.bind(this))
            .on('set', this.setHeatingTemperature.bind(this));

        this.coolingThresholdTemperature = this.service.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: 8,
                maxValue: 30,
                minStep: 1,
                //perms: [Characteristic.Perms.READ]
            })
            .on('get', this.getCoolingTemperature.bind(this))
            .on('set', this.setCoolingTemperature.bind(this));


        switch (device.widget) {
            case 'DimplexVentilationInletOutlet'://COULD BE REMOVED
                this.targetState.setProps({validValues: [0, 2]});
                break;
            case 'AtlanticPassAPCZoneControl':
                this.targetState.setProps({validValues: [Characteristic.TargetHeaterCoolerState.HEAT, Characteristic.TargetHeaterCoolerState.COOL]});
                break;
        }
    }

    getHeatingTemperature(callback) {
        callback(null, this.getHeatingThreasholdTemperature());
    }

    getCoolingTemperature(callback) {
        callback(null, this.getCoolingThreasholdTemperature());
    }

    setHeatingTemperature(value, callback) {
        switch (this.device.widget) {
            case 'AtlanticPassAPCZoneControl':
                if (this.activeState.value !== Characteristic.Active.INACTIVE) {
                    this._executeOnAllZone("setHeatingTargetTemperature", value, callback);
                    if (this.getDisplayTemperature() > value) {
                        this.currentState.updateValue(Characteristic.CurrentHeaterCoolerState.IDLE);
                    } else {
                        this.currentState.updateValue(Characteristic.CurrentHeaterCoolerState.HEATING);
                    }
                }
                break;
        }
    }

    setCoolingTemperature(value, callback) {
        switch (this.device.widget) {
            case 'AtlanticPassAPCZoneControl':
                if (this.activeState.value !== Characteristic.Active.INACTIVE) {
                    this._executeOnAllZone("setCoolingTargetTemperature", value, callback);
                    if (this.getDisplayTemperature() < value) {
                        this.currentState.updateValue(Characteristic.CurrentHeaterCoolerState.IDLE);
                    } else {
                        this.currentState.updateValue(Characteristic.CurrentHeaterCoolerState.COOLING);
                    }
                }
                break;
        }
    }

    _getAllChildZones() {
        let devices = [];
        for (let device of this.platform.platformDevices) {
            if (device.widget === 'AtlanticPassAPCHeatingAndCoolingZone' && device.deviceURL.split('#')[0] === this.device.deviceURL.split("#")[0]) {
                devices.push(device);
            }
        }
        return devices;
    }

    _executeOnAllZone(command, value, callback) {
        var commandCount = 0;
        for (let device of this._getAllChildZones()) {
            device.executeCommand([new Command(command, value)], function (status, error, data) {
                switch (status) {
                    case ExecutionState.INITIALIZED:
                        commandCount++;
                        if (commandCount === this.device.states['core:ZonesNumberState']) {
                            callback();
                        }
                        break;
                    case ExecutionState.IN_PROGRESS:
                        break;
                    case ExecutionState.COMPLETED:
                        break;
                    case ExecutionState.FAILED:
                        break;
                    default:
                        break;
                }

            }.bind(this));
        }
    }


    getDisplayTemperature() {
        let compareFunc = this.device.states['io:PassAPCOperatingModeState'] === 'heating' ? Math.max : Math.min;
        var displayTemp;
        for (let device of this.platform.platformDevices) {
            if (device.widget === 'TemperatureSensor' && device.deviceURL.split('#')[0] === this.device.deviceURL.split("#")[0]) {
                for (let state of device.states) {
                    if (state.name == 'core:TemperatureState') {
                        displayTemp = displayTemp ? compareFunc(displayTemp, state.value) : state.value;
                    }
                }
            }
        }
        return displayTemp;
    }

    getHeatingThreasholdTemperature() {
        var displayTemp;
        for (let device of this._getAllChildZones()) {
            for (let state of device.states) {
                if (state.name == 'core:HeatingTargetTemperatureState') {
                    displayTemp = displayTemp ? Math.max(displayTemp, state.value) : state.value;
                }
            }
        }
        return displayTemp;
    }

    getCoolingThreasholdTemperature() {
        var displayTemp;

        for (let device of this._getAllChildZones()) {
            for (let state of device.states) {
                if (state.name == 'core:CoolingTargetTemperatureState') {
                    displayTemp = displayTemp ? Math.min(displayTemp, state.value) : state.value;
                }
            }
        }
        return displayTemp;
    }

    /**
     * Triggered when Homekit try to modify the Characteristic.TargetHeaterCoolerState
     **/
    setStatus(value, callback) {

        var commands = [];

        switch (this.device.widget) {
            case 'DimplexVentilationInletOutlet'://COULD BE REMOVED
                switch (value) {
                    case Characteristic.TargetHeaterCoolerState.AUTO:
                        commands.push(new Command('auto'));
                        break;
                    case Characteristic.TargetHeaterCoolerState.COOL:
                        commands.push(new Command('max'));
                        break;
                }
                break;
            case 'AtlanticPassAPCZoneControl':
                switch (value) {
                    case Characteristic.TargetHeaterCoolerState.HEAT:
                        if (this.device.states['io:PassAPCOperatingModeState'] !== 'heating') {
                            commands.push(new Command('setPassAPCOperatingMode', 'heating'));
                            for (let device of this._getAllChildZones()) {
                                device.services[0].markZoneOn('heating');
                            }
                        }
                        break;
                    case Characteristic.TargetHeaterCoolerState.COOL:
                        if (this.device.states['io:PassAPCOperatingModeState'] !== 'cooling') {
                            commands.push(new Command('setPassAPCOperatingMode', 'cooling'));
                            for (let device of this._getAllChildZones()) {
                                device.services[0].markZoneOn("cooling");
                            }
                        }
                        break;
                }

                break;
        }
        if (commands.length > 0) {
            this.device.executeCommand(commands, function (status, error, data) {
                switch (status) {
                    case ExecutionState.INITIALIZED:
                        callback(error);
                        break;
                    case ExecutionState.IN_PROGRESS:
                        break;
                    case ExecutionState.COMPLETED:
                        if (this.device.stateless) {
                            this.currentState.updateValue(value);
                        }
                        break;
                    case ExecutionState.FAILED:
                        this.targetState.updateValue(this.currentState.value);
                        break;
                    default:
                        break;
                }
            }.bind(this), callback);
        } else {
            callback();
        }
    }


    getActive(callback) {
        callback(null, this.device.states['io:PassAPCOperatingModeState'] !== 'stop' ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
    }

    setActive(value, callback) {

        var commands = [];

        switch (this.device.widget) {
            case 'AtlanticPassAPCZoneControl':
                switch (value) {
                    case Characteristic.Active.ACTIVE:
                        value = this.device.states['io:LastPassAPCOperatingModeState'];
                        if (value !== this.device.states['io:PassAPCOperatingModeState'] && value !== 'stop') {
                            commands.push(new Command('setPassAPCOperatingMode', value));
                            for (let device of this._getAllChildZones()) {
                                device.services[0].markZoneOn(value);
                            }
                        }
                        break;
                    case Characteristic.Active.INACTIVE:
                        commands.push(new Command('setPassAPCOperatingMode', 'stop'));
                        for (let device of this._getAllChildZones()) {
                            device.services[0].markZoneOff();
                        }
                        break;
                }

                break;
        }
        if (commands.length > 0) {
            this.device.executeCommand(commands, function (status, error, data) {
                switch (status) {
                    case ExecutionState.INITIALIZED:
                        callback(error);
                        break;
                    case ExecutionState.IN_PROGRESS:
                        break;
                    case ExecutionState.COMPLETED:
                        if (this.device.stateless) {
                            this.activeState.updateValue(value);
                        }
                        break;
                    case ExecutionState.FAILED:
                        break;
                    default:
                        break;
                }
            }.bind(this), callback);
        } else {
            callback();
        }
    }

    onStateUpdate(name, value) {
        var currentState = null, targetState = null;

        switch (name) {
            case 'io:VentilationConfigurationModeState':
                currentState = Characteristic.CurrentHeaterCoolerState.INACTIVE;
                break;
            case 'io:PassAPCOperatingModeState':

                if (value === 'heating') {
                    if (this.getDisplayTemperature() > this.getHeatingThreasholdTemperature()) {
                        this.currentState.updateValue(Characteristic.CurrentHeaterCoolerState.IDLE);
                    } else {
                        this.currentState.updateValue(Characteristic.CurrentHeaterCoolerState.HEATING);
                    }

                    this.targetState.updateValue(Characteristic.TargetHeaterCoolerState.HEAT);
                    this.activeState.updateValue(Characteristic.Active.ACTIVE);
                } else if (value === 'cooling') {
                    if (this.getDisplayTemperature() < this.getCoolingThreasholdTemperature()) {
                        this.currentState.updateValue(Characteristic.CurrentHeaterCoolerState.IDLE);
                    } else {
                        this.currentState.updateValue(Characteristic.CurrentHeaterCoolerState.COOLING);
                    }

                    this.targetState.updateValue(Characteristic.TargetHeaterCoolerState.COOL);
                    this.activeState.updateValue(Characteristic.Active.ACTIVE);
                } else if (value === 'stop') {
                    this.currentState.updateValue(Characteristic.CurrentHeaterCoolerState.INACTIVE);
                    this.activeState.updateValue(Characteristic.Active.INACTIVE);

                    for (let device of this._getAllChildZones()) {
                        device.services[0].markZoneOff();
                    }

                }
                this.currentTemperature.updateValue(this.getDisplayTemperature());
                break;
        }
    }
}

module.exports = HeaterCooler