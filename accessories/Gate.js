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
    this.targetState.on('set', this.setState.bind(this));
    
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
                case ExecutionState.COMPLETED:
                case ExecutionState.FAILED:
                    that.targetState.updateValue(that.currentState.value);
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
        if (name == State.STATE_OPEN_CLOSED_PEDESTRIAN) {
        	var converted = null;
            switch(value) {
				case 'unknown':
				case 'open' : converted = Characteristic.CurrentDoorState.OPEN; break;
				case 'pedestrian' : converted = Characteristic.CurrentDoorState.STOPPED; break;
				case 'closed' : converted = Characteristic.CurrentDoorState.CLOSED; break;
			}

            this.currentState.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetState.updateValue(converted);
        }
    }
}