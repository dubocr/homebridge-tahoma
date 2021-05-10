import { Characteristics, Services } from '../Platform';
import { Characteristic, Service } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class GarageDoor extends Mapper {
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;
    protected on: Characteristic | undefined;
    protected currentPedestrian: Characteristic | undefined;
    protected targetPedestrian: Characteristic | undefined;

    protected cyclic;
    protected cycleDuration;
    protected pedestrianCommand;

    protected applyConfig(config) {
        this.cyclic = config['cyclic'] || false;
        this.cycleDuration = (config['cycleDuration'] || 5) * 1000;
        this.pedestrianCommand = ['setPedestrianPosition', 'partialPosition', 'my']
            .find((command: string) => this.device.hasCommand(command));
    }

    protected registerServices() {
        const service = this.registerService(Services.GarageDoorOpener);
        this.currentState = service.getCharacteristic(Characteristics.CurrentDoorState);
        this.targetState = service.getCharacteristic(Characteristics.TargetDoorState);
        this.targetState.onSet(this.setTargetState.bind(this));

        this.cyclic = this.cyclic || this.device.hasCommand('cycle');
        if (this.pedestrianCommand && this.device.uiClass === 'Gate') {
            this.registerLockService('pedestrian');
        }
        if (this.stateless) {
            this.currentState.updateValue(Characteristics.CurrentDoorState.CLOSED);
            this.targetState.updateValue(Characteristics.TargetDoorState.CLOSED);
            this.currentPedestrian?.updateValue(Characteristics.LockCurrentState.SECURED);
            this.targetPedestrian?.updateValue(Characteristics.LockCurrentState.SECURED);
        }
    }

    protected registerSwitchService(subtype?: string): Service {
        const service = this.registerService(Services.Switch, subtype);
        this.on = service.getCharacteristic(Characteristics.On);

        this.on?.onSet(this.setOn.bind(this));
        return service;
    }

    protected registerLockService(subtype?: string): Service {
        const service = this.registerService(Services.LockMechanism, subtype);
        this.currentPedestrian = service.getCharacteristic(Characteristics.LockCurrentState);
        this.targetPedestrian = service.getCharacteristic(Characteristics.LockTargetState);

        this.targetPedestrian?.onSet(this.setLock.bind(this));
        return service;
    }

    protected getTargetCommands(value) {
        if (this.device.hasCommand('cycle')) {
            return new Command('cycle');
        } else {
            return new Command(value ? 'close' : 'open');
        }
    }

    protected async setOn(value) {
        const action = await this.executeCommands(this.getOnCommands(value));
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.FAILED:
                    this.on?.updateValue(!value);
                    break;
            }
        });
    }

    protected getOnCommands(value): Command | Array<Command> {
        if (value) {
            return this.pedestrianCommand ? new Command(this.pedestrianCommand) : [];
        } else {
            return new Command('close');
        }
    }

    protected async setLock(value) {
        const action = await this.executeCommands(this.getLockCommands(value));
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    if (this.stateless) {
                        this.onStateChanged(
                            'core:OpenClosedPedestrianState',
                            value === Characteristics.LockTargetState.SECURED ? 'closed' : 'pedestrian',
                        );
                    }
                    break;
            }
        });
    }

    protected getLockCommands(value): Command | Array<Command> {
        if (value === Characteristics.LockTargetState.UNSECURED) {
            return this.pedestrianCommand ? new Command(this.pedestrianCommand) : [];
        } else {
            return new Command('close');
        }
    }

    protected async setTargetState(value) {
        const previousTarget = this.targetState?.value;
        const action = await this.executeCommands(this.getTargetCommands(value));
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.IN_PROGRESS:
                    if (value === Characteristics.TargetDoorState.OPEN) {
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.OPENING);
                    } else {
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.CLOSING);
                    }
                    break;
                case ExecutionState.COMPLETED:
                    if (this.stateless) {
                        this.currentState?.updateValue(value);
                        if (this.cyclic) {
                            setTimeout(() => {
                                this.currentState?.updateValue(Characteristics.CurrentDoorState.CLOSED);
                                this.targetState?.updateValue(Characteristics.TargetDoorState.CLOSED);
                            }, this.cycleDuration);
                        }
                        this.onStateChanged(
                            'core:OpenClosedPedestrianState',
                            value === Characteristics.TargetDoorState.CLOSED ? 'closed' : 'open',
                        );
                    }
                    break;
                case ExecutionState.FAILED:
                    if (previousTarget) {
                        this.targetState?.updateValue(previousTarget);
                    }
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value) {
        let targetState;
        let targetPedestrian;
        switch (name) {
            case 'core:OpenClosedPedestrianState':
            case 'core:OpenClosedUnknownState':
            case 'core:OpenClosedState':
            case 'core:OpenClosedPartialState':
                switch (value) {
                    case 'unknown':
                    case 'open':
                        this.on?.updateValue(false);
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.OPEN);
                        targetState = Characteristics.TargetDoorState.OPEN;
                        this.currentPedestrian?.updateValue(Characteristics.LockCurrentState.UNKNOWN);
                        targetPedestrian = Characteristics.LockTargetState.UNSECURED;
                        break;
                    case 'pedestrian':
                    case 'partial':
                        this.on?.updateValue(true);
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.STOPPED);
                        targetState = Characteristics.TargetDoorState.OPEN;
                        this.currentPedestrian?.updateValue(Characteristics.LockCurrentState.UNSECURED);
                        targetPedestrian = Characteristics.LockTargetState.UNSECURED;
                        break;
                    case 'closed':
                        this.on?.updateValue(false);
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.CLOSED);
                        targetState = Characteristics.TargetDoorState.CLOSED;
                        this.currentPedestrian?.updateValue(Characteristics.LockCurrentState.SECURED);
                        targetPedestrian = Characteristics.LockTargetState.SECURED;
                        break;
                }
                break;
        }

        if (this.targetState && targetState !== undefined) {
            this.targetState.updateValue(targetState);
        }
        if (this.targetPedestrian && targetPedestrian !== undefined) {
            this.targetPedestrian.updateValue(targetPedestrian);
        }
    }
}