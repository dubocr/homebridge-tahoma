var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class Switch extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;
        
        if(this.device.uiClass == 'WaterHeatingSystem' || this.device.widget == 'AtlanticElectricalTowelDryer') {
            if(this.device._look_state('io:PassAPCDHWConfigurationState') == 'snapshot') {
                this.service = new Service.Switch('N/A');
            } else {
                this.service = new Service.Switch('BOOST');
            }
        } else {
            this.service = new Service.Switch(device.getName());
        }
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
            case 'AtlanticPassAPCBoiler':
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
            case 'AtlanticElectricalTowelDryer':
                commands = [];
                commands.push(new Command('setTowelDryerTemporaryState', value ? 'boost' : 'permanentHeating'));
                if(value) {
                    commands.push(new Command('setTowelDryerBoostModeDuration', 10));
                }
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
            switch (status) {
                case ExecutionState.FAILED:
                    this.onState.updateValue(!value);
                break;
            }
        }.bind(this), callback);
    }
    
    onStateUpdate(name, value) {
        var onState = null;

        switch(name) {
            case 'core:OnOffState':
            case 'io:ForceHeatingState':
            case 'core:BoostOnOffState':
                onState = value == 'on' ? true : false;
            break;
            case 'io:TowelDryerTemporaryStateState':
                onState = value == 'boost' ? true : false;
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