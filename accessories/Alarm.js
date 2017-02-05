var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return Alarm;
}

/**
 * Accessory "Alarm"
 */
 
Alarm = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.SecuritySystem(device.label);

    this.currentState = service.getCharacteristic(Characteristic.SecuritySystemCurrentState);
    this.targetState = service.getCharacteristic(Characteristic.SecuritySystemTargetState)
    this.targetState.on('set', this.setState.bind(this));
    
    this.services.push(service);
};

Alarm.UUID = 'Alarm';

Alarm.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.SecuritySystemTargetState
	**/
    setState: function(value, callback) {
        var that = this;
        var commandName = null;
		switch(value) {
			default:
			case Characteristic.SecuritySystemTargetState.STAY_ARM:
			case Characteristic.SecuritySystemTargetState.AWAY_ARM:
			case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
				 commandName = 'alarmOn';
			break;
			case Characteristic.SecuritySystemTargetState.DISARM:
				 commandName = 'alarmOff';
			break;
		}
        var command = new Command(commandName);
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                break;
                case ExecutionState.FAILED:
                    that.targetState.updateValue(that.currentState.value != Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED ? that.currentState.value : null);
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
    	//this.log.debug('['+this.name+'] ' + name + '=' + value); // For analysis
        if (name == State.STATE_ACTIVE_ZONES) {
        	var converted = null;
        	var target = null;
            switch(value) {
				default:
				case '': target = converted = Characteristic.SecuritySystemCurrentState.DISARMED; break;
				case 'A,B': target = converted = Characteristic.SecuritySystemCurrentState.STAY_ARM; break;
				case 'A,B,C': target = converted = Characteristic.SecuritySystemCurrentState.AWAY_ARM; break;
				case 'A': target = converted = Characteristic.SecuritySystemCurrentState.NIGHT_ARM; break;
				case 'triggered': converted = Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED; break;
			}

            this.currentState.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetState.updateValue(target);
        }
    }
}