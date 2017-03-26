var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return GarageDoor;
}

/**
 * Accessory "GarageDoor"
 */
 
GarageDoor = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.GarageDoorOpener(device.label);

    this.currentState = service.getCharacteristic(Characteristic.CurrentDoorState);
    this.targetState = service.getCharacteristic(Characteristic.TargetDoorState)
    this.targetState.on('set', this.setState.bind(this));
    if(this.device.widget == 'UpDownGarageDoor4T') {
    	this.targetState.on('set', this.cycle.bind(this));
    } else {
    	this.targetState.on('set', this.setState.bind(this));
    }
    this.services.push(service);
};

GarageDoor.UUID = 'GarageDoor';

GarageDoor.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.TargetDoorState
	**/
    setState: function(value, callback) {
        var that = this;
        
        var command = new Command(value == Characteristic.TargetDoorState.OPEN ? 'open' : 'close');
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.IN_PROGRESS:
                    var newValue = (value == Characteristic.TargetDoorState.OPEN) ? Characteristic.CurrentDoorState.OPENING : Characteristic.CurrentDoorState.CLOSING;
                    that.currentState.updateValue(newValue);
                    break;
                case ExecutionState.COMPLETED:
                break;
                case ExecutionState.FAILED:
                	// Update target in case of error
                    that.targetState.updateValue(value == Characteristic.TargetDoorState.OPEN ? Characteristic.TargetDoorState.CLOSED : Characteristic.TargetDoorState.OPEN);
                    break;
                default:
                    break;
            }
        });
    },
    
    /**
	* Triggered when Homekit try to modify the Characteristic.TargetDoorState for UpDownGarageDoor4T
	**/
    cycle: function(value, callback) {
        var that = this;
        
        if(value == Characteristic.TargetDoorState.CLOSED) {
        	callback("Can't close this device");
        	return;
        }
        var command = new Command('cycle');
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.IN_PROGRESS:
                    that.currentState.updateValue(Characteristic.CurrentDoorState.OPENING);
                    break;
                case ExecutionState.COMPLETED:
                	that.currentState.updateValue(Characteristic.CurrentDoorState.OPEN);
                	setTimeout(function() {
                		that.currentState.updateValue(Characteristic.CurrentDoorState.CLOSED);
                	}, 30000); // Simulate end of cycle after 30 seconds
                break;
                case ExecutionState.FAILED:
                	// Update target in case of error
                    that.targetState.updateValue(Characteristic.TargetDoorState.CLOSED);
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
    	if (name == State.STATE_OPEN_CLOSED_UNKNOWN) {
        	var converted = null;
        	var target = null;
            switch(value) {
				case 'unknown':
				case 'open' :
					converted = Characteristic.CurrentDoorState.OPEN;
					target = Characteristic.TargetDoorState.OPEN;
				break;
				case 'closed' :
					converted = Characteristic.CurrentDoorState.CLOSED;
					target = Characteristic.TargetDoorState.CLOSED;
				break;
			}

            this.currentState.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetState.updateValue(target);
        }
    }
}