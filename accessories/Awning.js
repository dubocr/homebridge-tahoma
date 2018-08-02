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
    var def = config['defaultPosition'] || 50;
    
    var service = this.device.uiClass == 'Window' ? new Service.Window(device.label) : new Service.WindowCovering(device.label);
	
    this.currentPosition = service.getCharacteristic(Characteristic.CurrentPosition);
    this.targetPosition = service.getCharacteristic(Characteristic.TargetPosition);
    if(this.device.widget.startsWith('UpDownHorizontal')) {
    	this.targetPosition.on('set', this.deployUndeployCommand.bind(this));
    	this.currentPosition.updateValue(def);
    	this.targetPosition.updateValue(def);
    } else if(this.device.widget.startsWith('PositionableHorizontal')) {
    	this.targetPosition.on('set', this.setDeployment.bind(this));
    	this.obstruction = service.addCharacteristic(Characteristic.ObstructionDetected);
    } else if(this.device.widget.startsWith('UpDown') || this.device.widget.startsWith('RTS')) {
    	this.targetPosition.on('set', this.upDownCommand.bind(this));
    	this.currentPosition.updateValue(def);
    	this.targetPosition.updateValue(def);
    } else {
    	this.targetPosition.on('set', this.postpone.bind(this, this.setClosure.bind(this)));
    	this.obstruction = service.addCharacteristic(Characteristic.ObstructionDetected);
    }
    this.positionState = service.getCharacteristic(Characteristic.PositionState);
    this.positionState.updateValue(Characteristic.PositionState.STOPPED);
    
    for(command of this.device.definition.commands) {
    	if(command.commandName == 'setOrientation')	{
    		this.currentAngle = service.addCharacteristic(Characteristic.CurrentHorizontalTiltAngle);
    		this.targetAngle = service.addCharacteristic(Characteristic.TargetHorizontalTiltAngle);
    		this.targetAngle.on('set', this.setAngle.bind(this));
    		break;
    	}
    }
    
    this.services.push(service);
};

Awning.UUID = 'Awning';

Awning.prototype = {
    
	/**
	* Triggered when Homekit try to modify the Characteristic.TargetPosition
	* HomeKit '0' => Close (100% Closure)
	* HomeKit '100' => Open (0% Closure)
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
					if(that.obstruction != null) {
						that.obstruction.updateValue(error == 'WHILEEXEC_BLOCKED_BY_HAZARD');
					}
					break;
				default:
					break;
			}
		});
    },
    
    /**
	* Triggered when Homekit try to modify the Characteristic.TargetPosition
	* HomeKit '0' => Close (0% Deployment)
	* HomeKit '100' => Open (100% Deployment)
	**/
    setDeployment: function(value, callback) {
        var that = this;
        var command = new Command('setDeployment', [value]);
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.IN_PROGRESS:
                    var newValue = (value == 100 || value < that.currentPosition.value) ? Characteristic.PositionState.INCREASING : Characteristic.PositionState.DECREASING;
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
	* Triggered when Homekit try to modify the Characteristic.TargetPosition for UpDownHorizontalAwning
	**/
    deployUndeployCommand: function(value, callback) {
        var that = this;
        var command;
        switch(value) {
			case 100: command = new Command('deploy'); break;
			case 0: command = new Command('undeploy'); break;
			default: command = new Command('my'); break;
		}
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.IN_PROGRESS:
                    var newValue = (value == 100 || value < that.currentPosition.value) ? Characteristic.PositionState.INCREASING : Characteristic.PositionState.DECREASING;
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
	* Triggered when Homekit try to modify the Characteristic.TargetPosition for RTS RollerShutter
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
    
    /**
	* Triggered when Homekit try to modify the Characteristic.TargetPosition for UpDownRollerShutter
	**/
    openCloseCommand: function(value, callback) {
    	var that = this;
		var command;
		switch(value) {
			case 100: command = new Command('open'); break;
			case 0: command = new Command('close'); break;
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
    
    /**
	* Triggered when Homekit try to modify the Characteristic.TargetAngle
	**/
    setAngle: function(value, callback) {
        var that = this;

        var command = new Command('setOrientation', [Math.round((value + 90)/1.8)]);
        this.executeCommand(command, function(status, error, data) {
        	switch (status) {
            	case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                case ExecutionState.FAILED:
                    that.targetAngle.updateValue(that.currentAngle.value); // Update target position in case of cancellation
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
		} else if (name == 'core:DeploymentState') {
			this.currentPosition.updateValue(value);
			if (!this.isCommandInProgress()) // if no command running, update target
				this.targetPosition.updateValue(value);
		} else if (name == 'core:SlateOrientationState') {
			var converted = Math.round(value * 1.8 - 90);
			if(this.currentAngle)
				this.currentAngle.updateValue(converted);
			if (this.targetAngle && !this.isCommandInProgress()) // if no command running, update target
				this.targetAngle.updateValue(converted);
		}
    }
}