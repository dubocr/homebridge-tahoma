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
 
Light = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.Lightbulb(device.label);

    this.onState = service.getCharacteristic(Characteristic.On);
    this.onState.on('set', this.setOn.bind(this));
    
    if(this._look_state(State.STATE_INTENSITY) != null) {
    	this.brightnessState = service.addCharacteristic(Characteristic.Brightness);
    	this.brightnessState.on('set', this.setBrightness.bind(this));
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
        
        var command = new Command('setOnOff');
        command.parameters = value ? ['on'] : ['off'];
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

    onStateUpdate: function(name, value) {
        if (name == State.STATE_ON_OFF) {
            this.onState.updateValue(value == 'on' ? true : false);
        } else if (name == State.STATE_INTENSITY) {
        	if(this.brightnessState != null)
        		this.brightnessState.updateValue(value);
        }
    }
}