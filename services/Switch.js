var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class Switch extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;
		
        this.service = new Service.Switch(device.getName());
        this.onState = this.service.getCharacteristic(Characteristic.On);
        this.onState.on('set', Switch.prototype.setOn.bind(this));
    }

        /**
	* Triggered when Homekit try to modify the Characteristic.On
	**/
    setOn(value, callback) {
        var commands = [];
        switch(this.device.widget) {
            case 'AtlanticPassAPCHeatPump':
            case 'AtlanticPassAPCZoneControl':
                commands = new Command('setPassAPCOperatingMode', value ? 'heating' : 'stop');
            break;
            case 'AtlanticElectricalHeaterWithAdjustableTemperatureSetpoint':
            case 'SomfyPilotWireElectricalHeater':
            case 'AtlanticElectricalHeater':
                commands = new Command('setHeatingLevel', value ? 'comfort' : 'eco');
            break;
            case 'AtlanticPassAPCDHW':
                commands = new Command('setBoostOnOffState', value ? 'on' : 'off');
            break;
            case 'DomesticHotWaterTank':
                commands = new Command('setForceHeating', value ? 'on' : 'off');
            break;
            case 'MusicPlayer':
                commands = new Command(value ? 'play' : 'stop');
            break;
			case 'DimplexVentilationInletOutlet':
				commands = new Command(value ? 'max' : 'auto');
			break;
            case 'Siren':
            default:
                commands = new Command(value ? 'on' : 'off');
            break;
        }
        this.device.executeCommand(commands, function(status, error, data) {
			if(status == ExecutionState.FAILED || status == ExecutionState.COMPLETED) { callback(error); } // HomeKit callback
            switch (status) {
                case ExecutionState.FAILED:
                    this.onState.updateValue(!value);
                break;
            }
        }.bind(this));
    }
    
    onStateUpdate(name, value) {
        var onState = null;

        switch(name) {
            case 'core:OnOffState':
            case 'io:ForceHeatingState':
            case 'core:BoostOnOffState':
                onState = value == 'on' ? true : false;
            break;
            case 'io:TargetHeatingLevelState':
                onState = value == 'comfort' ? true : false;
            break;
            case 'io:PassAPCOperatingModeState':
                onState = value == 'stop' ? false : true;
            break;
            case 'core:PlayState':
                switch(value) {
                    case 'forward':
                    case 'playing':
                    case 'rewind':
                        onState = true;
                    break;
                    case 'stop':
                    case 'pause':
                        onState = false;
                    break;
                }
            break;
        }

        if (this.onState != null && onState != null)
            this.onState.updateValue(onState);
    }
}

module.exports = Switch