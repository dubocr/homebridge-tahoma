import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class RollerShutter extends Mapper {
    protected currentPosition: Characteristic | undefined;
    protected targetPosition: Characteristic | undefined;
    protected positionState: Characteristic | undefined;
    protected obstructionDetected: Characteristic | undefined;

    protected reverse;
    protected initPosition;
    protected defaultPosition;

    protected applyConfig(config) {
        this.defaultPosition = config['defaultPosition'] || 0;
        this.initPosition = config['initPosition'] !== undefined ? config['initPosition'] : (config['defaultPosition'] || 50);
        this.reverse = config['reverse'] || false;
    }

    protected registerServices() {
        const service = this.registerService(this.platform.Service.WindowCovering);
        this.currentPosition = service.getCharacteristic(this.platform.Characteristic.CurrentPosition);
        this.targetPosition = service.getCharacteristic(this.platform.Characteristic.TargetPosition);
        this.positionState = service.getCharacteristic(this.platform.Characteristic.PositionState);
        
        this.positionState.updateValue(this.platform.Characteristic.PositionState.STOPPED);
        this.targetPosition.on('set', this.debounce(this.setTargetPosition));

        if(this.stateless) {
            this.currentPosition?.updateValue(this.initPosition);
            this.targetPosition?.updateValue(this.initPosition);
        } else {
            this.obstructionDetected = service.getCharacteristic(this.platform.Characteristic.ObstructionDetected);
        }
    }

    protected getTargetCommands(value) {
        const target = this.reverse ? (100 - value) : value;
        return new Command('setClosure', (100-target));
    }

    async setTargetPosition(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getTargetCommands(value), callback);
        action.on('update', (state, data) => {
            const positionState = (value === 100 || value > (this.currentPosition?.value || 0)) ? 
                this.platform.Characteristic.PositionState.INCREASING : 
                this.platform.Characteristic.PositionState.DECREASING;
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
    }
    
    protected reversedValue(value) {
        return this.reverse ? value : (100-value);
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:ClosureState':
                this.currentPosition?.updateValue(this.reversedValue(value));
                if(this.targetPosition && !this.device.hasState('core:TargetClosureState')) {
                    this.targetPosition.value = this.reversedValue(value);
                }
                break;
            case 'core:TargetClosureState':
                this.targetPosition?.updateValue(this.reversedValue(value));
                break;
        }
    }
}