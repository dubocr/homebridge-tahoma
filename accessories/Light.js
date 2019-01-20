var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return Light;
}

/**
 * Accessory "Light"
 */
 
Light = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.Lightbulb(device.label);

    this.onState = service.getCharacteristic(Characteristic.On);
    this.onState.on('set', this.setOn.bind(this));
    
    if(this.device.widget.includes('Dimmer')) {
    	this.brightnessState = service.addCharacteristic(Characteristic.Brightness);
    	this.brightnessState.on('set', this.setBrightness.bind(this));
    }
    
    if(this.device.widget.includes('HueSat')) {
    	this.hueTarget = 0;
    	this.hueState = service.addCharacteristic(Characteristic.Hue);
    	this.hueState.on('set', this.setHue.bind(this));
    	this.saturationState = service.addCharacteristic(Characteristic.Saturation);
    	this.saturationState.on('set', this.setSaturation.bind(this));
    }
    
    this.services.push(service);
};

Light.UUID = 'Light';

Light.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.On
	**/
    setOn: function(value, callback) {
        var that = this;
        
        if(this.device.widget == 'DimmerLight' && value == 1) { // Ignore 'on' command for dimmable light as homekit send 'on' + 'brightness'
        	callback();
        	return;
        }
        
        var command = new Command(value ? 'on' : 'off');
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
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
        });
    },
    
    /**
	* Triggered when Homekit try to modify the Characteristic.Brightness
	**/
    setBrightness: function(value, callback) {
        var that = this;
        
        var command = new Command('setIntensity');
        command.parameters = [value];
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
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
        });
    },
    
    setHueSat: function(hue, saturation, callback) {
        var that = this;
        
        var command = new Command('setHueAndSaturation');
        command.parameters = [hue, saturation];
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
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
        });
    },
    
    /**
	* Triggered when Homekit try to modify the Characteristic.Hue
	**/
    setHue: function(value, callback) {
    	this.hueTarget = value;
        //this.setHueSat(value, this.saturationState.value, callback); // Done when Saturation is set
        callback();
    },
    
    /**
	* Triggered when Homekit try to modify the Characteristic.Saturation
	**/
    setSaturation: function(value, callback) {
        this.setHueSat(this.hueTarget, value, callback);
    },

    onStateUpdate: function(name, value) {
        if (name == 'core:OnOffState') {
            this.onState.updateValue(value == 'on' ? true : false);
        } else if (name == 'core:IntensityState' || name == 'core:LightIntensityState') {
        	if(this.brightnessState != null)
        		this.brightnessState.updateValue(value);
        } else if (name == 'core:ColorHueState' && this.hueState != null) {
        	this.hueState.updateValue(value);
        } else if (name == 'core:ColorSaturationState' && this.saturationState != null) {
        	this.saturationState.updateValue(value);
        }
    }
}