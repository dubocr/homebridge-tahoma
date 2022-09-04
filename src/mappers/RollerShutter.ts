import { Characteristics, Services } from '../Platform';
import { Characteristic, CharacteristicSetCallback, Service } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';
import { MyPositionCharacteristic } from '../CustomCharacteristics';

export default class RollerShutter extends Mapper {
    protected windowService: Service | undefined;

    protected currentPosition: Characteristic | undefined;
    protected targetPosition: Characteristic | undefined;
    protected positionState: Characteristic | undefined;
    protected obstructionDetected: Characteristic | undefined;
    protected my: Characteristic | undefined;

    protected reverse;
    protected initPosition;
    protected defaultPosition;
    protected blindsOnRollerShutter;
    protected movementDuration;
    protected offsetMovementDuration;

    protected cancelTimeout;

    protected applyConfig(config) {
        this.defaultPosition = config['defaultPosition'] || 0;
        this.initPosition = config['initPosition'] !== undefined ? config['initPosition'] : (config['defaultPosition'] || 50);
        this.reverse = config['reverse'] || false;
        this.movementDuration = config['movementDuration'] || 0;
        this.offsetMovementDuration = config['offsetMovementDuration'] || 0;
        this.blindsOnRollerShutter = config['blindsOnRollerShutter'] || false;
        this.stateless = !this.device.hasState('core:ClosureState') && !this.device.hasState('core:TargetClosureState');
    }

    protected registerServices() {
        const service = this.registerService(Services.WindowCovering);
        service.addOptionalCharacteristic(MyPositionCharacteristic);
        this.currentPosition = service.getCharacteristic(Characteristics.CurrentPosition);
        this.targetPosition = service.getCharacteristic(Characteristics.TargetPosition);
        this.positionState = service.getCharacteristic(Characteristics.PositionState);
        if (this.stateless) {
            //this.currentPosition.updateValue(this.initPosition);
            //this.targetPosition.updateValue(this.initPosition);
            if (this.device.hasCommand('my')) {
                this.my = service.getCharacteristic(MyPositionCharacteristic);
                this.my.onSet(this.setMyPosition.bind(this));
            }
        } else {
            this.obstructionDetected = service.getCharacteristic(Characteristics.ObstructionDetected);
        }
        if (service.testCharacteristic(Characteristics.On)) {
            this.my = service.getCharacteristic(Characteristics.On);
            service.removeCharacteristic(this.my);
        }
        this.positionState.updateValue(Characteristics.PositionState.STOPPED);
        this.targetPosition.onSet(this.debounce(this.setTargetPosition));
    }

    protected getTargetCommands(value): Command | Command[] {
        if (this.stateless) {
            if (value === 100) {
                return new Command('open');
            } else if (value === 0) {
                return new Command('close');
            } else {
                if (this.movementDuration > 0) {
                    const delta = value - Number(this.currentPosition!.value);
                    return new Command(delta > 0 ? 'open' : 'close');
                } else {
                    return new Command('my');
                }
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
        if (this.cancelTimeout !== null) {
            clearTimeout(this.cancelTimeout);
        }
        const standalone = this.stateless && this.movementDuration > 0 && value !== 100 && value !== 0;
        const action = await this.executeCommands(this.getTargetCommands(value), standalone);
        action.on('update', (state, data) => {
            const positionState = (value === 100 || value > (this.currentPosition?.value || 0)) ?
                Characteristics.PositionState.INCREASING :
                Characteristics.PositionState.DECREASING;
            switch (state) {
                case ExecutionState.TRANSMITTED:
                    if (standalone) {
                        const delta = value - Number(this.currentPosition!.value);
                        const duration = this.offsetMovementDuration * 1000 + Math.round(this.movementDuration * Math.abs(delta) * 1000 / 100);
                        this.info('Will stop movement in ' + duration + ' millisec');
                        this.cancelTimeout = setTimeout(() => {
                            this.cancelTimeout = null;
                            if (this.isIdle) {
                                this.executeCommands(new Command('stop'), true);
                            } else {
                                this.cancelExecution().catch(this.error.bind(this));
                            }
                        }, duration);
                    }
                    break;
                case ExecutionState.IN_PROGRESS:
                    this.positionState?.updateValue(positionState);
                    break;
                case ExecutionState.COMPLETED:
                    this.positionState?.updateValue(Characteristics.PositionState.STOPPED);
                    if (this.stateless) {
                        if (this.defaultPosition) {
                            this.currentPosition?.updateValue(this.defaultPosition);
                            this.targetPosition?.updateValue(this.defaultPosition);
                        } else {
                            this.currentPosition?.updateValue(value);
                        }
                    } else {
                        this.obstructionDetected?.updateValue(false);
                    }
                    if (this.blindsOnRollerShutter && value < 98) {
                        this.executeCommands(new Command('setClosure', value + 2));
                    }
                    break;
                case ExecutionState.FAILED:
                    if (this.stateless && data.failureType === 'CMDCANCELLED' && this.movementDuration > 0) {
                        if (this.defaultPosition) {
                            this.currentPosition?.updateValue(this.defaultPosition);
                            this.targetPosition?.updateValue(this.defaultPosition);
                        } else {
                            this.currentPosition?.updateValue(value);
                        }
                    }
                    this.positionState?.updateValue(Characteristics.PositionState.STOPPED);
                    this.obstructionDetected?.updateValue(data.failureType === 'WHILEEXEC_BLOCKED_BY_HAZARD');
                    if (!this.device.hasState('core:TargetClosureState') && this.currentPosition) {
                        this.targetPosition?.updateValue(this.currentPosition.value);
                    }
                    break;
            }
        });
    }

    /**
    * Set My position
    **/
    async setMyPosition(value) {
        if (!value) {
            return;
        }
        const action = await this.executeCommands(new Command('my'));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    this.my?.updateValue(0);
                    if (this.stateless) {
                        if (this.defaultPosition) {
                            this.currentPosition?.updateValue(this.defaultPosition);
                            this.targetPosition?.updateValue(this.defaultPosition);
                        } else {
                            this.currentPosition?.updateValue(50);
                            this.targetPosition?.updateValue(50);
                        }
                    }
                    break;
                case ExecutionState.FAILED:
                    this.my?.updateValue(0);
                    this.obstructionDetected?.updateValue(data.failureType === 'WHILEEXEC_BLOCKED_BY_HAZARD');
                    if (!this.device.hasState('core:TargetClosureState') && this.currentPosition) {
                        this.targetPosition?.updateValue(this.currentPosition.value);
                    }
                    break;
            }
        });
    }

    protected reversedValue(value) {
        return this.reverse ? value : (100 - value);
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:ClosureState':
                this.currentPosition?.updateValue(this.reversedValue(value));
                if (!this.device.hasState('core:TargetClosureState') && this.isIdle) {
                    this.targetPosition?.updateValue(this.reversedValue(value));
                }
                break;
            case 'core:TargetClosureState':
                this.targetPosition?.updateValue(this.reversedValue(value));
                if (!this.device.hasState('core:ClosureState')) {
                    this.currentPosition?.updateValue(this.reversedValue(value));
                }
                break;
        }
    }
}