import { Characteristics, Services } from '../Platform';
import {Characteristic, Service} from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class GarageDoor extends Mapper {
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;
    protected on: Characteristic | undefined;

    protected cyclic;
    protected cycleDuration;

    protected applyConfig(config) {
        this.cyclic = config['cyclic'] || false;
        this.cycleDuration = (config['cycleDuration'] || 5) * 1000;
    }

    protected registerServices() {
        const service = this.registerService(Services.GarageDoorOpener);
        this.currentState = service.getCharacteristic(Characteristics.CurrentDoorState);
        this.targetState = service.getCharacteristic(Characteristics.TargetDoorState);
        this.targetState.onSet(this.setTargetState.bind(this));

        this.cyclic = this.cyclic || this.device.hasCommand('cycle');
        if(this.stateless) {
            this.currentState.updateValue(Characteristics.CurrentDoorState.CLOSED);
            this.targetState.updateValue(Characteristics.TargetDoorState.CLOSED);
        }
        if(this.device.hasCommand('setPedestrianPosition') || this.device.hasCommand('my')) {
            this.registerSwitchService('pedestrian');
        }
    }

    protected getTargetCommands(value) {
        if(this.device.hasCommand('cycle')) {
            return new Command('cycle'); 
        } else {
            return new Command(value ? 'close' : 'open');
        }
    }

    protected registerSwitchService(subtype?: string): Service {
        const service = this.registerService(Services.Switch, subtype);
        this.on = service.getCharacteristic(Characteristics.On);

        this.on?.onSet(this.setOn.bind(this));
        return service;
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
        if(this.device.hasCommand('setPedestrianPosition')) {
            return new Command(value ? 'setPedestrianPosition' : 'close');
        } else {
            return new Command(value ? 'my' : 'close');
        }
    }

    protected async setTargetState(value) {
        const action = await this.executeCommands(this.getTargetCommands(value));
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    if(this.stateless) {
                        this.currentState?.updateValue(value);
                        if(this.cyclic) {
                            setTimeout(() => {
                                this.currentState?.updateValue(Characteristics.CurrentDoorState.CLOSED);
                                this.targetState?.updateValue(Characteristics.TargetDoorState.CLOSED);
                            }, this.cycleDuration);
                        }
                    }
                    break;
                case ExecutionState.FAILED:
                    if(this.currentState) {
                        this.targetState?.updateValue(this.currentState.value);
                    }
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:OpenClosedPedestrianState':
            case 'core:OpenClosedUnknownState':
            case 'core:OpenClosedState':
            case 'core:OpenClosedPartialState':
                switch(value) {
                    case 'unknown':
                    case 'open' :
                        this.on?.updateValue(false);
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.OPEN);
                        if(this.isIdle) {
                            this.targetState?.updateValue(Characteristics.TargetDoorState.OPEN);
                        }
                        break;
                    case 'pedestrian' :
                    case 'partial' :
                        this.on?.updateValue(true);
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.STOPPED);
                        if(this.isIdle) {
                            this.targetState?.updateValue(Characteristics.TargetDoorState.OPEN);
                        }
                        break;
                    case 'closed' :
                        this.on?.updateValue(false);
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.CLOSED);
                        if(this.isIdle) {
                            this.targetState?.updateValue(Characteristics.TargetDoorState.CLOSED);
                        }
                        break;
                }
                break;
        }
    }
}