var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class GarageDoorOpener extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.GarageDoorOpener(device.getName());
        this.currentState = this.service.getCharacteristic(Characteristic.CurrentDoorState);
        this.targetState = this.service.getCharacteristic(Characteristic.TargetDoorState)
        this.targetState.on('set', this.setState.bind(this));
        
        if(device.stateless) {
            this.currentState.updateValue(Characteristic.CurrentDoorState.CLOSED);
            this.targetState.updateValue(Characteristic.TargetDoorState.CLOSED);
        }
    }

    /**
	* Triggered when Homekit try to modify the Characteristic.TargetDoorState
	**/
    setState(value, callback) {
        var commands = [];
       
        switch(this.device.widget) {
            case 'CyclicSwingingGateOpener':
            case 'OpenCloseSlidingGate4T':
            case 'OpenCloseGate4T':
            case 'UpDownGarageDoor4T':
            case 'CyclicGarageDoor':
            case 'RTSGeneric4T':
            case 'CyclicGeneric':
                commands.push(new Command('cycle'));
                setTimeout(function() {
                	this.currentState.update(!value);
                	this.targetState.update(!value);
                }.bind(this), 5000);
            break;

            case 'OpenCloseSlidingGate':
            case 'OpenCloseGate':
            case 'DiscreteGateWithPedestrianPosition':
            case 'CyclicSwingingGateOpener':
            case 'CyclicSwingingGateOpener':
            case 'UpDownGarageDoorWithVentilationPosition':
            case 'UpDownGarageDoor':
            case 'DiscretePositionableGarageDoor':
                if(this.device.isCommandInProgress()) {
                    return this.device.cancelCommand(callback);
                } else {
                    commands.push(new Command(value == Characteristic.TargetDoorState.OPEN ? 'open' : 'close'));
                }
            break;

            case 'PositionableGarageDoor':
            case 'SlidingDiscreteGateWithPedestrianPosition':
                commands.push(new Command(value == Characteristic.TargetDoorState.OPEN ? 'open' : 'close'));
            break;
        }
        this.device.executeCommand(commands, function(status, error, data) {
			if(status == ExecutionState.IN_PROGRESS) { callback(error); } // HomeKit callback
            switch (status) {
                case ExecutionState.COMPLETED:
                    if(this.device.statelesse) {
                        this.currentState.update(value);
                    }
                break;
                case ExecutionState.FAILED:
                    this.targetState.updateValue(this.currentState.value);
                break;
            }
        }.bind(this), callback);
    }

    onStateUpdate(name, value) {
        var currentState = null, targetState = null;

        switch(name) {
            case 'core:OpenClosedPedestrianState':
            case 'core:OpenClosedUnknownState':
            case 'core:OpenClosedState':
            switch(value) {
				case 'unknown':
				case 'open' :
                    currentState = Characteristic.CurrentDoorState.OPEN;
					targetState = Characteristic.TargetDoorState.OPEN;
                break;
				case 'pedestrian' :
                    currentState = Characteristic.CurrentDoorState.STOPPED;
					targetState = Characteristic.TargetDoorState.OPEN;
                break;
				case 'closed' :
                    currentState = Characteristic.CurrentDoorState.CLOSED;
					targetState = Characteristic.TargetDoorState.CLOSED;
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

module.exports = GarageDoorOpener