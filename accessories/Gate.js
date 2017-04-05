var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return Gate;
}

/**
 * Accessory "Gate"
 */
 
Gate = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.GarageDoorOpener(device.label);

    this.currentState = service.getCharacteristic(Characteristic.CurrentDoorState);
    this.targetState = service.getCharacteristic(Characteristic.TargetDoorState)
    if(this.device.widget == 'OpenCloseGate4T') {
    	this.currentState.updateValue(Characteristic.CurrentDoorState.CLOSED);
    	this.targetState.updateValue(Characteristic.TargetDoorState.CLOSED);
    	this.targetState.on('set', this.cycle.bind(this));
    } else {
    	this.targetState.on('set', this.setState.bind(this));
    }
    
    this.services.push(service);
};

Gate.UUID = 'Gate';

Gate.prototype = {

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
        
        var command = new Command('cycle');
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.IN_PROGRESS:
                    break;
                case ExecutionState.COMPLETED:
                	var newValue = (value == Characteristic.TargetDoorState.OPEN) ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSED;
                    that.currentState.updateValue(newValue);
                break;
                case ExecutionState.FAILED:
                	// Restore target in case of error
                    that.targetState.updateValue(value == Characteristic.TargetDoorState.OPEN ? Characteristic.TargetDoorState.CLOSED : Characteristic.TargetDoorState.OPEN);
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
        if (name == State.STATE_OPEN_CLOSED_PEDESTRIAN) {
        	var converted = null;
        	var target = null;
            switch(value) {
				case 'unknown':
				case 'open' :
					converted = Characteristic.CurrentDoorState.OPEN;
					target = Characteristic.TargetDoorState.OPEN;
				break;
				case 'pedestrian' :
					converted = Characteristic.CurrentDoorState.STOPPED;
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