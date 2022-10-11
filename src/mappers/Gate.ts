import { Characteristics, Services } from '../Platform';
import { Characteristic, Service } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import GarageDoor from './GarageDoor';

export default class Gate extends GarageDoor {
    protected expectedStates = ['core:OpenClosedPedestrianState'];

    protected currentPedestrian: Characteristic | undefined;
    protected targetPedestrian: Characteristic | undefined;
    protected on: Characteristic | undefined;

    protected pedestrianCommand;
    protected pedestrianDuration;

    protected cancelTimeout;

    protected applyConfig(config) {
        super.applyConfig(config);
        this.pedestrianDuration = (config['pedestrianDuration'] || 0) * 1000;
        this.pedestrianCommand = ['setPedestrianPosition', 'partialPosition', 'my']
            .find((command: string) => this.device.hasCommand(command));
    }

    protected registerServices() {
        const services = super.registerServices();
        if (this.pedestrianCommand || this.pedestrianDuration) {
            const pedestrian = this.registerLockService('pedestrian');
            services.push(pedestrian);
        }
        if (this.stateless) {
            this.currentPedestrian?.updateValue(Characteristics.LockCurrentState.SECURED);
            this.targetPedestrian?.updateValue(Characteristics.LockCurrentState.SECURED);
        }
        return services;
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

    protected getLockCommands(value): Command | Array<Command> {
        if (value === Characteristics.LockTargetState.UNSECURED && this.pedestrianCommand) {
            return new Command(this.pedestrianCommand);
        } else {
            return new Command(value === Characteristics.LockTargetState.UNSECURED ? 'open' : 'close');
        }
    }

    protected async setLock(value) {
        if (this.cancelTimeout !== null) {
            clearTimeout(this.cancelTimeout);
        }
        const action = await this.executeCommands(this.getLockCommands(value));
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.IN_PROGRESS:
                    if (this.stateless && !this.pedestrianCommand && this.pedestrianDuration) {
                        this.info('Will stop movement in ' + this.pedestrianDuration + ' millisec');
                        this.cancelTimeout = setTimeout(() => {
                            this.cancelTimeout = null;
                            if (this.isIdle) {
                                this.executeCommands(new Command('stop'), true);
                            } else {
                                this.cancelExecution().catch(this.error.bind(this));
                            }
                        }, this.pedestrianDuration);
                    }
                    break;
                case ExecutionState.COMPLETED:
                    if (this.stateless) {
                        this.onStateChanged(
                            'core:OpenClosedPedestrianState',
                            value === Characteristics.LockTargetState.SECURED ? 'closed' : 'pedestrian',
                        );
                        if (this.cyclic) {
                            setTimeout(() => {
                                this.onStateChanged('core:OpenClosedPedestrianState', 'closed');
                            }, this.cycleDuration);
                        }
                    }
                    break;
            }
        });
    }

    protected getOnCommands(value): Command | Array<Command> {
        if (value && this.pedestrianCommand) {
            return new Command(this.pedestrianCommand);
        } else {
            return new Command(value ? 'open' : 'close');
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

    protected onStateChanged(name: string, value) {
        let targetState;
        let targetPedestrian;
        if (this.expectedStates.includes(name)) {
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
        }

        if (this.targetState && targetState !== undefined) {
            this.targetState.updateValue(targetState);
        }
        if (this.targetPedestrian && targetPedestrian !== undefined) {
            this.targetPedestrian.updateValue(targetPedestrian);
        }
    }
}