var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class GarageDoorOpener extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;
		
        this.cycle = config['cycle'] || false;
        this.reverse = config['reverse'] || false;

        this.service = new Service.GarageDoorOpener(device.getName());
        this.obstruction = this.service.getCharacteristic(Characteristic.ObstructionDetected);
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
    setState(requestedValue, callback) {
        var commands = [];
        var value = this.reverse ? (requestedValue == Characteristic.TargetDoorState.OPEN ? Characteristic.TargetDoorState.CLOSED : Characteristic.TargetDoorState.OPEN) : requestedValue;
       	
        switch(this.device.widget) {
            case 'CyclicSlidingGarageOpener':
            case 'CyclicSwingingGateOpener':
            case 'CyclicGarageDoor':
            case 'CyclicGeneric':
                //this.cycle = true;
            case 'OpenCloseSlidingGate4T':
            case 'OpenCloseGate4T':
            case 'UpDownGarageDoor4T':
            case 'RTSGeneric4T':
                commands.push(new Command('cycle'));
            break;

            case 'OpenCloseSlidingGate':
            case 'OpenCloseGate':
            case 'DiscreteGateWithPedestrianPosition':
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
            case 'PositionableGarageDoorWithPartialPosition':
                commands.push(new Command(value == Characteristic.TargetDoorState.OPEN ? 'open' : 'close'));
            break;
        }
        this.device.executeCommand(commands, function(status, error, data) {
			if(status == ExecutionState.IN_PROGRESS) { callback(error); } // HomeKit callback
            switch (status) {
                case ExecutionState.COMPLETED:
                    if(this.device.stateless) {
                        this.currentState.updateValue(requestedValue);
                        if(this.cycle) {
                        	setTimeout(function() {
                				this.currentState.updateValue(Characteristic.CurrentDoorState.CLOSED);
                				this.targetState.updateValue(Characteristic.TargetDoorState.CLOSED);
                			}.bind(this), 5000);
                		}
                    }
                    if(this.obstruction != null && this.obstruction.value == true) {
                        this.obstruction.updateValue(false);
                    }
                break;
                case ExecutionState.FAILED:
                    this.targetState.updateValue(this.currentState.value);
                    if(this.obstruction != null) {
						this.obstruction.updateValue(error == 'WHILEEXEC_OTHER');
                    }
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
            case 'core:OpenClosedPartialState':
            switch(value) {
				case 'unknown':
				case 'open' :
                    currentState = Characteristic.CurrentDoorState.OPEN;
					targetState = Characteristic.TargetDoorState.OPEN;
                break;
				case 'pedestrian' :
                case 'partial' :
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