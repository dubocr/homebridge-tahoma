var Generic, Characteristic, Command, ExecutionState;
Generic = require('./Generic');

module.exports = function(homebridge, log, api) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    return LockMechanism;
}

class LockMechanism extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.LockMechanism(device.getName());
        
        this.currentState = this.service.getCharacteristic(Characteristic.LockCurrentState);
        this.targetState = this.service.getCharacteristic(Characteristic.LockTargetState)
        
        this.targetState.on('set', this.setState.bind(this));

        this.services.push(this.service);
    }

    /**
	* Triggered when Homekit try to modify the Characteristic.LockTargetState
	**/
    setState(value, callback) {
        var commands = null;
       
        commands = new Command(value == Characteristic.LockTargetState.SECURED ? 'lock' : 'unlock');
        this.executeCommand(commands, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED: callback(error); break;
                case ExecutionState.IN_PROGRESS: break;
                case ExecutionState.COMPLETED: break;
                case ExecutionState.FAILED:
                    this.targetState.updateValue(this.currentState.value);
                break;
                default: break;
            }
        }.bind(this));
    }

    onStateUpdate(name, value) {
        var currentState = null, targetState = null;

        switch(name) {
            case 'core:LockedUnlockedState':
            switch(value) {
                case '':
                currentState = Characteristic.LockCurrentState.SECURED;
                targetState = Characteristic.LockTargetState.SECURED;
                break;
                case '':
                currentState = Characteristic.LockCurrentState.UNSECURED;
                targetState = Characteristic.LockTargetState.UNSECURED;
                break;
            }
            break;
        }

    	if(this.currentState != null && currentState != null)
            this.currentState.updateValue(currentState);
        if(!this.isCommandInProgress() && this.targetState != null && targetState != null)
            this.targetState.updateValue(targetState);
    }
}    