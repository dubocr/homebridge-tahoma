import Mapper from '../Mapper';
import { Characteristic, CharacteristicValue, CharacteristicSetCallback} from 'homebridge';
import { ExecutionState, Command, Action } from 'overkiz-client';

export default class Window extends Mapper {
    protected currentPosition;
    protected targetPosition;
    protected positionState;
    protected obstructionDetected;

    protected reverse = false;
    protected defaultPosition = 0;
    protected cycle = false;

    buildServices() {
        const service = this.registerService(this.platform.Service.Window);
        this.currentPosition = service.getCharacteristic(this.platform.Characteristic.CurrentPosition);
        this.targetPosition = service.getCharacteristic(this.platform.Characteristic.TargetPosition);
        this.positionState = service.getCharacteristic(this.platform.Characteristic.PositionState);
        this.obstructionDetected = service.getCharacteristic(this.platform.Characteristic.ObstructionDetected);
        this.targetPosition.on('set', this.debounce(this.setTargetPosition));
    }

    setTargetPosition(value, callback: CharacteristicSetCallback) {

        this.debug('current ' + this.currentPosition.value);
        this.debug('target ' + this.targetPosition.value);

        const commands: Command[] = [];
        const target = this.reverse ? (100 - value) : value;
        commands.push(new Command('setClosure', (100-target)));
        this.executeCommands(commands)
            .then((action: Action) => {
                callback(null);
                action.on('state', (state, data) => {
                    const positionState = (value === 100 || value > (this.currentPosition?.value || 0)) ? this.platform.Characteristic.PositionState.INCREASING : this.platform.Characteristic.PositionState.DECREASING;
                    switch (state) {
                        case ExecutionState.IN_PROGRESS:
                            this.positionState?.updateValue(positionState);
                            break;
                        case ExecutionState.COMPLETED:
                            this.positionState?.updateValue(this.platform.Characteristic.PositionState.STOPPED);
                            if(this.stateless) {
                                if(this.defaultPosition) {
                                    this.currentPosition?.updateValue(this.defaultPosition);
                                    this.targetPosition?.updateValue(this.defaultPosition);
                                } else {
                                    this.currentPosition?.updateValue(value);
                                    if(this.cycle) {
                                        setTimeout(() => {
                                            this.currentPosition?.updateValue(this.defaultPosition);
                                            this.targetPosition?.updateValue(this.defaultPosition);
                                        }, 5000);
                                    }
                                }
                            }
                            this.obstructionDetected?.updateValue(false);
                            break;
                        case ExecutionState.FAILED:
                            this.positionState?.updateValue(this.platform.Characteristic.PositionState.STOPPED);
                            this.obstructionDetected?.updateValue(data.failureType === 'WHILEEXEC_BLOCKED_BY_HAZARD');
                            this.targetPosition?.updateValue(this.currentPosition?.value || 0); // Update target position in case of cancellation
                            break;
                    }
                });
            })
            .catch(callback);
    }

    onStateChange(name, value) {
        let currentPosition;
        let targetPosition;
        let currentAngle;
        let targetAngle;
        
        switch(name) {
            case 'core:DeploymentState':
                currentPosition = this.reverse ? (100 - value) : value;
                targetPosition = currentPosition;
                break;

            case 'core:TargetClosureState':
            case 'core:ClosureState':
                if(value === 99) {
                    value = 100;
                } // Workaround for io:RollerShutterVeluxIOComponent remains 1% opened
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

            case 'core:OpenClosedPedestrianState':
            case 'core:OpenClosedUnknownState':
            case 'core:OpenClosedPartialState':
                currentPosition = value === 'closed' ? 0 : 100;
                targetPosition = currentPosition;
                break;

            default: break;
        }

        if(this.config.blindMode === 'orientation' && ['core:OpenClosedState', 'core:SlateOrientationState'].includes(name)) {
            if(this.device.states['core:OpenClosedState'] === 'closed') {
                const orientation = this.reverse ? this.device.states['core:SlateOrientationState'] : (100-this.device.states['core:SlateOrientationState']);
                if(Number.isInteger(orientation)) {
                    currentPosition = orientation;
                    const t = this.targetPosition?.getValue() ||0;
                    if(Math.round(orientation/5) === Math.round(t/5)) {
                        this.targetPosition?.updateValue(orientation);
                    }
                }
            } else {
                currentPosition = 0;
            }
            targetPosition = currentPosition;
        }

        if(currentPosition !== undefined) {
            this.currentPosition.updateValue(currentPosition);
        }
        if(!this.device.isCommandInProgress() && targetPosition !== undefined) {
            this.targetPosition.updateValue(targetPosition);
        }
        /*if(currentAngle !== undefined) {
            this.currentAngle?.updateValue(currentAngle);
        }
        if(!this.device.isCommandInProgress() && targetAngle !== undefined) {
            this.targetAngle?.updateValue(targetAngle);
        }*/
    }
}