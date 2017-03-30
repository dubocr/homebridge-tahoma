var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return Awning;
}

/**
 * Accessory "Awning"
 */
 
Awning = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.WindowCovering(device.label);

    this.currentPosition = service.getCharacteristic(Characteristic.CurrentPosition);
    this.targetPosition = service.getCharacteristic(Characteristic.TargetPosition);
    if(this.device.widget == 'UpDownHorizontalAwning') {
    	this.targetPosition.on('set', this.upDownCommand.bind(this));
    } else {
    	this.targetPosition.on('set', this.setPosition.bind(this));
    }
    this.positionState = service.getCharacteristic(Characteristic.PositionState);
    this.positionState.updateValue(Characteristic.PositionState.STOPPED);
    
    this.services.push(service);
};

Awning.UUID = 'Awning';

Awning.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.TargetPosition
	**/
    setPosition: function(value, callback) {
        var that = this;
        if (this.lastExecId in this.api.executionCallback) {
            this.api.cancelCommand(this.lastExecId, function() {});
        }

        var command = new Command('setPosition');
        command.parameters = [100 - value];
        this.executeCommand(command, function(status, error, data) {
            //that.log('['+that.name+'] ' + command.name + ' ' + status);
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.IN_PROGRESS:
                    var newValue = (value == 100 || value > that.currentPosition.value) ? Characteristic.PositionState.INCREASING : Characteristic.PositionState.DECREASING;
                    that.positionState.updateValue(newValue);
                    that.log('['+that.name+'] Command in progress, state='+newValue);
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
        if (this.lastExecId in this.api.executionCallback) {
            this.api.cancelCommand(this.lastExecId, function() {});
        }
		
		var cmd;
		switch(value) {
			case 100: cmd = 'up'; break;
			case 0: cmd = 'down'; break;
			default: cmd = 'my'; break;
		}
        var command = new Command(cmd);
        this.executeCommand(command, function(status, error, data) {
            //that.log('['+that.name+'] ' + command.name + ' ' + status);
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
    	if (name == State.STATE_CLOSURE) {
            this.log('['+this.name+'] ' + name + '=' + value); // For analysis
            var converted = 100 - value;
            this.currentPosition.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetPosition.updateValue(converted);
        }
    }
}