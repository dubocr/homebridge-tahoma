import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class GarageDoor extends Mapper {
    protected expectedStates = ['core:OpenClosedPartialState', 'core:OpenClosedUnknownState', 'core:OpenClosedState'];
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected cyclic;
    protected cycleDuration;

    protected applyConfig(config) {
        this.cyclic = config['cyclic'] || false;
        this.cycleDuration = (config['cycleDuration'] || 5) * 1000;
    }

    protected registerMainService() {
        const service = this.registerService(Services.GarageDoorOpener);
        this.currentState = service.getCharacteristic(Characteristics.CurrentDoorState);
        this.targetState = service.getCharacteristic(Characteristics.TargetDoorState);
        this.targetState.onSet(this.setTargetState.bind(this));

        this.cyclic = this.cyclic || this.device.hasCommand('cycle');
        if (this.stateless) {
            this.currentState.updateValue(Characteristics.CurrentDoorState.CLOSED);
            this.targetState.updateValue(Characteristics.TargetDoorState.CLOSED);
        }
        return service;
    }

    protected getTargetCommands(value) {
        if (this.device.hasCommand('cycle')) {
            return new Command('cycle');
        } else {
            return new Command(value ? 'close' : 'open');
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
                        this.onStateChanged(
                            this.expectedStates[0],
                            value === Characteristics.TargetDoorState.CLOSED ? 'closed' : 'open',
                        );
                        if (this.cyclic) {
                            setTimeout(() => {
                                this.onStateChanged(this.expectedStates[0], 'closed');
                            }, this.cycleDuration);
                        }
                    } else if (this.cyclic) {
                        this.requestStatesUpdate(60).catch((e) => this.warn(e));
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
        if (this.expectedStates.includes(name)) {
            switch (value) {
                case 'open':
                    this.currentState?.updateValue(Characteristics.CurrentDoorState.OPEN);
                    targetState = Characteristics.TargetDoorState.OPEN;
                    break;
                case 'partial':
                    this.currentState?.updateValue(Characteristics.CurrentDoorState.STOPPED);
                    targetState = Characteristics.TargetDoorState.OPEN;
                    break;
                case 'closed':
                    this.currentState?.updateValue(Characteristics.CurrentDoorState.CLOSED);
                    targetState = Characteristics.TargetDoorState.CLOSED;
                    break;
                case 'unknown':
                    break;
            }
        }

        if (this.targetState && targetState !== undefined) {
            this.targetState.updateValue(targetState);
        }
    }
}