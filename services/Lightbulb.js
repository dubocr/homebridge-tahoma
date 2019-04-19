var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class Lightbulb extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.Lightbulb(device.getName());
        this.onState = this.service.getCharacteristic(Characteristic.On);
        this.onState.on('set', this.setOn.bind(this));
        
        if(this.device.widget.includes('Dimmer')) {
            this.brightnessState = this.service.addCharacteristic(Characteristic.Brightness);
            this.brightnessState.on('set', this.setBrightness.bind(this));
        }
        
        if(this.device.widget.includes('HueSat')) {
            this.hueTarget = 0;
            this.hueState = this.service.addCharacteristic(Characteristic.Hue);
            this.hueState.on('set', this.setHue.bind(this));
            this.saturationState = this.service.addCharacteristic(Characteristic.Saturation);
            this.saturationState.on('set', this.setSaturation.bind(this));
        }
    }

    /**
	* Triggered when Homekit try to modify the Characteristic.On
	**/
    setOn(value, callback) {
        var commands = [];
        
        switch(this.device.widget) {
            case 'DimmerLight':
                if(value == 1) { callback(); break; } // Ignore 'on' command for dimmable light as homekit send 'on' + 'brightness'
            default:
                commands.push(new Command(value ? 'on' : 'off'));
            break;
        }
        if(commands.length) {
            this.device.executeCommand(commands, function(status, error, data) {
                switch (status) {
                    case ExecutionState.INITIALIZED: callback(error); break;
                    case ExecutionState.IN_PROGRESS:
                    case ExecutionState.COMPLETED:
                    case ExecutionState.FAILED:
                    default: break;
                }
            }.bind(this));
        }
    }
    
    /**
	* Triggered when Homekit try to modify the Characteristic.Brightness
	**/
    setBrightness(value, callback) {
        var commands = new Command('setIntensity', value);
        if(commands) {
            this.device.executeCommand(commands, function(status, error, data) {
                switch (status) {
                    case ExecutionState.INITIALIZED: callback(error); break;
                    case ExecutionState.IN_PROGRESS:
                    case ExecutionState.COMPLETED:
                    case ExecutionState.FAILED:
                    default: break;
                }
            }.bind(this));
        }
    }
    
    setHueSat(hue, saturation, callback) {
        var commands = new Command('setHueAndSaturation', [hue, saturation]);
        if(commands) {
            this.device.executeCommand(commands, function(status, error, data) {
                switch (status) {
                    case ExecutionState.INITIALIZED: callback(error); break;
                    case ExecutionState.IN_PROGRESS:
                    case ExecutionState.COMPLETED:
                    case ExecutionState.FAILED:
                    default: break;
                }
            }.bind(this));
        }
    }
    
    /**
	* Triggered when Homekit try to modify the Characteristic.Hue
	**/
    setHue(value, callback) {
    	this.hueTarget = value;
        //this.setHueSat(value, this.saturationState.value, callback); // Done when Saturation is set
        callback();
    }
    
    /**
	* Triggered when Homekit try to modify the Characteristic.Saturation
	**/
    setSaturation(value, callback) {
        this.setHueSat(this.hueTarget, value, callback);
    }

    onStateUpdate(name, value) {
        var onState = null, brightnessState = null, hueState = null, saturationState = null;

        switch(name) {
            case 'core:OnOffState':
                onState = value == 'on' ? true : false;
            break;
            case 'core:IntensityState':
            case 'core:LightIntensityState':
            brightnessState = value;
            break;
            case 'core:ColorHueState':
            hueState = value;
            break;
            case 'core:ColorSaturationState':
            saturationState = value;
            break;
        }

        if (this.onState != null && onState != null)
        this.onState.updateValue(onState);
        if (this.brightnessState != null && brightnessState != null)
        this.brightnessState.updateValue(brightnessState);
        if (this.hueState != null && hueState != null)
        this.hueState.updateValue(hueState);
        if (this.saturationState != null && saturationState != null)
        this.saturationState.updateValue(saturationState);
    }
}

module.exports = Lightbulb