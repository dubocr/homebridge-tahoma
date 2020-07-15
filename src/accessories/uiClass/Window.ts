import OverkizAccessory from '../OverkizAccessory';
import { Characteristic, CharacteristicValue, CharacteristicSetCallback} from 'homebridge';
import { ExecutionState, Command } from '../../api/OverkizClient';

export default class Window extends OverkizAccessory {
    protected currentPosition: Characteristic | null = null;
    protected targetPosition: Characteristic | null = null;
    protected positionState: Characteristic | null = null;
    protected obstructionDetected: Characteristic | null = null;

    protected reverse = false;
    protected defaultPosition = 0;
    protected cycle = false;

    build() {
        const service = this.registerService(this.platform.Service.Window);
        this.currentPosition = service.getCharacteristic(this.platform.Characteristic.CurrentPosition);
        this.targetPosition = service.getCharacteristic(this.platform.Characteristic.TargetPosition);
        this.positionState = service.getCharacteristic(this.platform.Characteristic.PositionState);
        this.obstructionDetected = service.getCharacteristic(this.platform.Characteristic.ObstructionDetected);
        this.targetPosition.on('set', this.postpone(this.setTargetPosition));
    }

    setTargetPosition(value, callback: CharacteristicSetCallback) {
        const commands: Command[] = [];
        const target = this.reverse ? (100 - value) : value;
        commands.push(new Command('setClosure', (100-target)));
        this.executeCommand(commands)
            .then((execution) => {
                callback(null);
                execution.on('state', (state, data) => {
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
}