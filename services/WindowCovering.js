var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class WindowCovering extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;
		
        this.defaultPosition = config['defaultPosition'] || 0;
        this.initPosition = config['initPosition'] !== undefined ? config['initPosition'] : (config['defaultPosition'] || 50);
        this.reverse = config['reverse'] || false;
        this.blindMode = config['blindMode'] || false;
        this.cycle = config['cycle'] || false;
        
        this.service = new Service[this.constructor.name](device.getName());

        this.currentPosition = this.service.getCharacteristic(Characteristic.CurrentPosition);
        this.targetPosition = this.service.getCharacteristic(Characteristic.TargetPosition);
		this.targetPosition.on('set', this.device.postpone.bind(this, this.setTarget.bind(this)));

        if(device.stateless) {
            this.currentPosition.updateValue(this.initPosition);
    	    this.targetPosition.updateValue(this.initPosition);
        } else {
            this.obstruction = this.service.addCharacteristic(Characteristic.ObstructionDetected);
        }

        if(device.hasCommand('setOrientation')) {
            this.currentAngle = this.service.addCharacteristic(Characteristic.CurrentHorizontalTiltAngle);
            this.targetAngle = this.service.addCharacteristic(Characteristic.TargetHorizontalTiltAngle);
            this.targetAngle.on('set', this.setAngle.bind(this));
        } else {
			this.blindMode = false;
		}

        this.positionState = this.service.getCharacteristic(Characteristic.PositionState);
        this.positionState.updateValue(Characteristic.PositionState.STOPPED);
    }

    /**
	* Triggered when Homekit try to modify the Characteristic.TargetPosition
	* HomeKit '0' (Close) => 100% Closure
	* HomeKit '100' (Open) => 0% Closure
	**/
    setTarget(requestedValue, callback) {
    	var commands = [];
		var value = this.reverse ? (100 - requestedValue) : requestedValue;
		
        switch(this.device.widget) {
            case 'PositionableHorizontalAwning':
                commands.push(new Command('setDeployment', value));
            break;

            case 'UpDownHorizontalAwning':
                if(this.device.isCommandInProgress() && (value == 100 || value == 0)) {
                    return this.device.cancelCommand(callback);
                } else if(value == 100) {
                    commands.push(new Command('deploy'));
                } else if(value == 0) {
                    commands.push(new Command('undeploy'));
                } else {
                    commands.push(new Command('my'));
                }
            break;

            case 'UpDownCurtain':
            case 'UpDownDualCurtain':
            case 'UpDownExteriorScreen':
            case 'UpDownExteriorVenetianBlind':
            case 'UpDownRollerShutter':
            case 'UpDownScreen':
            case 'UpDownVenetianBlind':
            case 'UpDownSwingingShutter':
                if(this.device.isCommandInProgress() && (value == 100 || value == 0)) {
                    return this.device.cancelCommand(callback);
                } else if(value == 100) {
                    commands.push(new Command('open'));
                } else if(value == 0) {
                    commands.push(new Command('close'));
                } else {
                    commands.push(new Command('my'));
                }
            break;

            case 'RTSGeneric':
                if(this.device.isCommandInProgress() && (value == 100 || value == 0)) {
                    return this.device.cancelCommand(callback);
                } else if(value == 0) {
                    commands.push(new Command('down'));
                } else {
                    commands.push(new Command('up'));
                }
            break;

            case 'PositionableScreen':            
            case 'PositionableScreenUno':
            case 'PositionableHorizontalAwningUno':
            case 'PositionableRollerShutter':
            case 'PositionableRollerShutterWithLowSpeedManagement':
            case 'PositionableTiltedRollerShutter':
            case 'PositionableRollerShutterUno':
            case 'PositionableTiltedScreen':
            case 'PositionableTiltedWindow':
            case 'PositionableGarageDoor':
            case 'DiscretePositionableGarageDoor':
            case 'AwningValance':
                commands.push(new Command('setClosure', (100-value)));
            break;

            case 'BioclimaticPergola':
                commands.push(new Command('setOrientation', value));
            break;

            case 'PositionableExteriorVenetianBlind':
                if(this.blindMode && value < 100) {
                    commands.push(new Command('setClosureAndOrientation', [100, value]));
                } else {
                    commands.push(new Command('setClosure', (100-value)));
                }
            break;

            // Garage doors
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

            default:
                commands.push(new Command(value ? 'open' : 'close'));
            break;
        }
		this.device.executeCommand(commands, function(status, error, data) {
			if(status == ExecutionState.IN_PROGRESS) { callback(error); } // HomeKit callback
			switch (status) {
				case ExecutionState.IN_PROGRESS:
					var positionState = (value == 100 || value > this.currentPosition.value) ? Characteristic.PositionState.INCREASING : Characteristic.PositionState.DECREASING;
					this.positionState.updateValue(positionState);
				break;
                case ExecutionState.COMPLETED:
                    this.positionState.updateValue(Characteristic.PositionState.STOPPED);
                    if(this.device.stateless) {
                        if(this.defaultPosition) {
                            this.currentPosition.updateValue(this.defaultPosition);
                            this.targetPosition.updateValue(this.defaultPosition);
                        } else {
                            this.currentPosition.updateValue(requestedValue);
                            if(this.cycle) {
                                setTimeout(function() {
                                    this.currentPosition.updateValue(this.defaultPosition);
                                    this.targetPosition.updateValue(this.defaultPosition);
                                }.bind(this), 5000);
                            }
                        }
                    }
                break;
				case ExecutionState.FAILED:
                    this.positionState.updateValue(Characteristic.PositionState.STOPPED);
					if(this.obstruction != null) {
						this.obstruction.updateValue(error == 'WHILEEXEC_BLOCKED_BY_HAZARD');
                    }
                    this.targetPosition.updateValue(this.currentPosition.value); // Update target position in case of cancellation
				break;
			}
		}.bind(this), callback);
    }

    /**
	* Triggered when Homekit try to modify the Characteristic.TargetAngle
	**/
    setAngle(value, callback) {
        var commands = [];

        switch(this.device.widget) {
            default:
            commands.push(new Command('setOrientation', Math.round((value + 90)/1.8)));
            break;
        }
		this.device.executeCommand(commands, function(status, error, data) {
			if(status == ExecutionState.IN_PROGRESS) { callback(error); } // HomeKit callback
        	switch (status) {
                case ExecutionState.COMPLETED:
                    if(this.device.stateless) {
						this.currentAngle.updateValue(value);
					}
                break;
                case ExecutionState.FAILED:
                    this.targetAngle.updateValue(this.currentAngle.value); // Update target position in case of cancellation
                break;
            }
        }.bind(this), callback);
    }
    
    onStateUpdate(name, value) {
        var currentPosition = null, targetPosition = null, currentAngle = null, targetAngle = null;
        switch(name) {
            case 'core:DeploymentState':
                currentPosition = this.reverse ? (100 - value) : value;
                targetPosition = currentPosition;
            break;

            case 'core:TargetClosureState':
            case 'core:ClosureState':
                if(value == 99) value = 100; // Workaround for io:RollerShutterVeluxIOComponent remains 1% opened
                currentPosition = this.reverse ? value : (100 - value);
                targetPosition = currentPosition;
            break;

            case 'core:SlateOrientationState':
                currentAngle = Math.round(value * 1.8 - 90);
                targetAngle = currentAngle;
            break;
			
			
            case 'core:SlatsOrientationState':
				currentPosition = this.reverse ? (100 - value) : value;
                targetPosition = currentPosition;
                currentAngle = Math.round(value * 1.8 - 90);
                targetAngle = currentAngle;
			break;

            default: break;
        }

        if(this.blindMode && ['core:OpenClosedState', 'core:SlateOrientationState'].includes(name)) {
            if(this.device.states['core:OpenClosedState'] == 'closed') {
				var orientation = this.device.states['core:SlateOrientationState'];
				if(Number.isInteger(orientation))
                    currentPosition = orientation;
			} else {
				currentPosition = 0;
			}
			targetPosition = currentPosition;
        }

        if(this.currentPosition != null && currentPosition != null)
            this.currentPosition.updateValue(currentPosition);
        if(!this.device.isCommandInProgress() && this.targetPosition != null && targetPosition != null)
            this.targetPosition.updateValue(targetPosition);
        if(this.currentAngle != null && currentAngle != null)
            this.currentAngle.updateValue(currentAngle);
        if(!this.device.isCommandInProgress() && this.targetAngle != null && targetAngle != null)
            this.targetAngle.updateValue(targetAngle);
    }
}

module.exports = WindowCovering
