var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return RollerShutter;
}

/**
 * Accessory "RollerShutter"
 */
 
RollerShutter = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.WindowCovering(device.label);

    this.currentPosition = service.getCharacteristic(Characteristic.CurrentPosition);
    this.targetPosition = service.getCharacteristic(Characteristic.TargetPosition)
    this.targetPosition.on('set', this.setPosition.bind(this));
    this.positionState = service.getCharacteristic(Characteristic.PositionState);
    this.positionState.updateValue(Characteristic.PositionState.STOPPED);
    
    this.services.push(service);
};

RollerShutter.UUID = 'RollerShutter';

RollerShutter.prototype = {

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

    onStateUpdate: function(name, value) {
        //this.log('['+this.name+'] ' + name + '=' + value+' ('+this.lastCommandFail+')');
        if (name == State.STATE_CLOSURE) {
            var converted = 100 - value;

            this.currentPosition.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetPosition.updateValue(converted);
        }
    }
}