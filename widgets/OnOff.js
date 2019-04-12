var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return OnOff;
}

/**
 * Accessory "OnOff"
 */
 
OnOff = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = this.device.widget == 'DimmerOnOff' ? new Service.Lightbulb(device.label) : new Service.Switch(device.label);

    this.onState = service.getCharacteristic(Characteristic.On);
    this.onState.on('set', this.setOn.bind(this));
    
    if(this.device.widget == 'DimmerOnOff') {
    	this.brightnessState = service.addCharacteristic(Characteristic.Brightness);
    	this.brightnessState.on('set', this.setBrightness.bind(this));
    }
    
    this.services.push(service);
};

OnOff.UUID = 'OnOff';

OnOff.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.On
	**/
    setOn: function(value, callback) {
        var that = this;
        
        if(this.device.widget == 'DimmerOnOff' && value == 1) { // Ignore 'on' command for dimmable switch as homekit send 'on' + 'brightness'
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
        
        var command = new Command('setIntensity', [value]);
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

    onStateUpdate: function(name, value) {
        if (name == 'core:OnOffState') {
        	this.onState.updateValue(value == 'on' ? true : false);
        } else if (name == 'core:IntensityState') {
        	if(this.brightnessState != null)
        		this.brightnessState.updateValue(value);
        }
    }
}