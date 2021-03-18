import { Characteristics, Services } from '../Platform';
import { Characteristic, CharacteristicSetCallback, Service } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class RollerShutter extends Mapper {
    protected windowService: Service | undefined;
    
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
        const service = this.registerService(Services.WindowCovering);
        this.currentPosition = service.getCharacteristic(Characteristics.CurrentPosition);
        this.targetPosition = service.getCharacteristic(Characteristics.TargetPosition);
        this.positionState = service.getCharacteristic(Characteristics.PositionState);
        if(this.stateless) {
            //this.currentPosition.updateValue(this.initPosition);
            //this.targetPosition.updateValue(this.initPosition);
        } else {
            this.obstructionDetected = service.getCharacteristic(Characteristics.ObstructionDetected);
        }
        this.positionState.updateValue(Characteristics.PositionState.STOPPED);
        this.targetPosition.onSet(this.debounce(this.setTargetPosition));
    }

    protected getTargetCommands(value) {
        if(this.stateless) {
            if(value === 100) {
                return new Command('open');
            } else if(value === 0) {
                return new Command('close');
            } else {
                return new Command('my');
            }
        } else {
            return new Command('setClosure', this.reversedValue(value));
        }
    }

    /**
	* Triggered when Homekit try to modify the Characteristic.TargetPosition
	* HomeKit '0' (Close) => 100% Closure
	* HomeKit '100' (Open) => 0% Closure
	**/
    async setTargetPosition(value) {
        if(this.stateless && !this.isIdle) {
            return await this.cancelExecution();
        }
        const action = await this.executeCommands(this.getTargetCommands(value));
        action.on('update', (state, data) => {
            const positionState = (value === 100 || value > (this.currentPosition?.value || 0)) ? 
                Characteristics.PositionState.INCREASING : 
                Characteristics.PositionState.DECREASING;
            switch (state) {
                case ExecutionState.IN_PROGRESS:
                    this.positionState?.updateValue(positionState);
                    break;
                case ExecutionState.COMPLETED:
                    this.positionState?.updateValue(Characteristics.PositionState.STOPPED);
                    if(this.stateless) {
                        if(this.defaultPosition) {
                            this.currentPosition?.updateValue(this.defaultPosition);
                            this.targetPosition?.updateValue(this.defaultPosition);
                        } else {
                            this.currentPosition?.updateValue(value);
                        }
                    } else {
                        this.obstructionDetected?.updateValue(false);
                    }
                    break;
                case ExecutionState.FAILED:
                    this.positionState?.updateValue(Characteristics.PositionState.STOPPED);
                    this.obstructionDetected?.updateValue(data.failureType === 'WHILEEXEC_BLOCKED_BY_HAZARD');
                    if(!this.device.hasState('core:TargetClosureState') && this.currentPosition) {
                        this.targetPosition?.updateValue(this.currentPosition.value);
                    }
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
                if(!this.device.hasState('core:TargetClosureState')) {
                    this.targetPosition?.updateValue(this.reversedValue(value));
                }
                break;
            case 'core:TargetClosureState':
                this.targetPosition?.updateValue(this.reversedValue(value));
                if(!this.device.hasState('core:ClosureState')) {
                    this.currentPosition?.updateValue(this.reversedValue(value));
                }
                break;
        }
    }
}