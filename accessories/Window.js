var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return Window;
}

/**
 * Accessory "Window"
 */
 
Window = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.Window(device.label);

    this.currentPosition = service.getCharacteristic(Characteristic.CurrentPosition);
    this.targetPosition = service.getCharacteristic(Characteristic.TargetPosition);
    if(this.device.widget == 'UpDownWindow') {
    	this.targetPosition.on('set', this.upDownCommand.bind(this));
    	this.currentPosition.updateValue(50);
    	this.targetPosition.updateValue(50);
    } else {
    	this.targetPosition.on('set', this.setClosure.bind(this));
    }
    this.positionState = service.getCharacteristic(Characteristic.PositionState);
    this.positionState.updateValue(Characteristic.PositionState.STOPPED);
    
    this.services.push(service);
};

Window.UUID = 'Window';

Window.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.TargetPosition
	**/
    setClosure: function(value, callback) {
        var that = this;

        var command = new Command('setClosure', [100 - value]);
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.IN_PROGRESS:
                    var newValue = (value == 100 || value > that.currentPosition.value) ? Characteristic.PositionState.INCREASING : Characteristic.PositionState.DECREASING;
                    that.positionState.updateValue(newValue);
                    break;
                case ExecutionState.COMPLETED:
                case ExecutionState.FAILED:
                    that.positionState.updateValue(Characteristic.PositionState.STOPPED);
                    that.targetPosition.updateValue(that.currentPosition.value); // Update target position in case of cancellation
                    break;
                default:
                    break;
            }
        });
    },
    
    /**
	* Triggered when Homekit try to modify the Characteristic.TargetPosition for UpDownRollerShutter
	**/
    upDownCommand: function(value, callback) {
    	var that = this;
		var command;
		switch(value) {
			case 100: command = new Command('up'); break;
			case 0: command = new Command('down'); break;
			default: command = new Command('my'); break;
		}
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.IN_PROGRESS:
                    var newValue = (value == 100 || value > that.currentPosition.value) ? Characteristic.PositionState.INCREASING : Characteristic.PositionState.DECREASING;
                    that.positionState.updateValue(newValue);
                    break;
                case ExecutionState.COMPLETED:
                	that.currentPosition.updateValue(value);
                case ExecutionState.FAILED:
                    that.positionState.updateValue(Characteristic.PositionState.STOPPED);
                    that.targetPosition.updateValue(that.currentPosition.value); // Update target position in case of cancellation
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
    	if (name == 'core:ClosureState' || name == 'core:TargetClosureState') {
        	var converted = 100 - value;
        	this.currentPosition.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetPosition.updateValue(converted);
        }
    }
}