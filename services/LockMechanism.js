var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class LockMechanism extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.LockMechanism(device.getName());
        
        this.currentState = this.service.getCharacteristic(Characteristic.LockCurrentState);
        this.targetState = this.service.getCharacteristic(Characteristic.LockTargetState)
        
        this.targetState.on('set', this.setState.bind(this));
    }

    /**
	* Triggered when Homekit try to modify the Characteristic.LockTargetState
	**/
    setState(value, callback) {
        var commands = null;
       
        commands = new Command(value == Characteristic.LockTargetState.SECURED ? 'lock' : 'unlock');
        this.device.executeCommand(commands, function(status, error, data) {
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
                case 'locked':
                currentState = Characteristic.LockCurrentState.SECURED;
                targetState = Characteristic.LockTargetState.SECURED;
                break;
                case 'unlocked':
                currentState = Characteristic.LockCurrentState.UNSECURED;
                targetState = Characteristic.LockTargetState.UNSECURED;
                break;
            }
            break;
        }

    	if(this.currentState != null && currentState != null)
            this.currentState.updateValue(currentState);
        if(!this.device.isCommandInProgress() && this.targetState != null && targetState != null)
            this.targetState.updateValue(targetState);
    }
}

module.exports = LockMechanism