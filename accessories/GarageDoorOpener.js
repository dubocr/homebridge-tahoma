
module.exports = function(homebridge, log, api) {
    Generic = require('Generic')(homebridge, log, api);
    Characteristic = homebridge.hap.Characteristic;
    return GarageDoorOpener;
}

class GarageDoorOpener extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.GarageDoorOpener(device.getName());
        this.currentState = service.getCharacteristic(Characteristic.CurrentDoorState);
        this.targetState = service.getCharacteristic(Characteristic.TargetDoorState)
        if(device.stateless) {
            this.currentState.updateValue(Characteristic.CurrentDoorState.CLOSED);
            this.targetState.updateValue(Characteristic.TargetDoorState.CLOSED);
        }
        this.services.push(this.service);
    }

    /**
	* Triggered when Homekit try to modify the Characteristic.TargetDoorState
	**/
    setState(value, callback) {
        var commands = null;
       
        switch(this.device.widget) {
            case 'CyclicSwingingGateOpener':
            case 'OpenCloseGate4T':
            case 'UpDownGarageDoor4T':
            case 'CyclicGarageDoor':
            case 'RTSGeneric4T':
            case 'CyclicGeneric':
                commands.push(new Command('cycle'));
            break;

            case 'OpenCloseSlidingGate':
            case 'OpenCloseGate':
            case 'DiscreteGateWithPedestrianPosition':
            case 'CyclicSwingingGateOpener':
            case 'CyclicSwingingGateOpener':
            case 'UpDownGarageDoorWithVentilationPosition':
            case 'UpDownGarageDoor':
            case 'DiscretePositionableGarageDoor':
                if(this.isCommandInProgress()) {
                    commands.push(new Command('stop'));
                } else {
                    commands.push(new Command(value == Characteristic.TargetDoorState.OPEN ? 'open' : 'close'));
                }
            break;

            case 'PositionableGarageDoor':
            case 'SlidingDiscreteGateWithPedestrianPosition':
                commands.push(new Command(value == Characteristic.TargetDoorState.OPEN ? 'open' : 'close'));
            break;
        }
        this.executeCommand(commands, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED: callback(error); break;
                case ExecutionState.IN_PROGRESS: break;
                case ExecutionState.COMPLETED:
                    if(this.device.statelesse) {
                        this.currentState.update(value);
                    }
                break;
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
            case 'core:OpenClosedPedestrianState':
            case 'core:OpenClosedUnknownState':
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
        if(!this.isCommandInProgress() && this.targetState != null && targetState != null)
            this.targetState.updateValue(targetState);
    }
}    