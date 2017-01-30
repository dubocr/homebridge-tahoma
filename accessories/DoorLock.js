var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return DoorLock;
}

/**
 * Accessory "DoorLock"
 */
 
DoorLock = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.LockMechanism(device.label);

    this.currentState = service.getCharacteristic(Characteristic.LockCurrentState);
    this.targetState = service.getCharacteristic(Characteristic.LockTargetState)
    this.targetState.on('set', this.setState.bind(this));
    
    this.services.push(service);
};

DoorLock.UUID = 'DoorLock';

DoorLock.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.LockTargetState
	**/
    setState: function(value, callback) {
        var that = this;
        
        var command = new Command(value == Characteristic.LockTargetState.SECURED ? 'lock' : 'unlock');
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
        if (name == State.STATE_LOCKED_UNLOCKED) {
        	var converted = value == 'locked' ? Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;
            this.currentState.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetState.updateValue(converted);
        }
    }
}