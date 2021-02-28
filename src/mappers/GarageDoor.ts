import { Characteristics, Services } from '../Platform';
import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class GarageDoor extends Mapper {
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected cycle;
    protected reverse;
    protected cycleDuration;

    protected applyConfig(config) {
        this.cycle = config['cycle'] || false;
        this.reverse = config['reverse'] || false;
        this.cycleDuration = config['cycleDuration'] || 5000;
    }

    protected registerServices() {
        const service = this.registerService(Services.GarageDoorOpener);
        this.currentState = service.getCharacteristic(Characteristics.CurrentDoorState);
        this.targetState = service.getCharacteristic(Characteristics.TargetDoorState);
        this.targetState.on('set', this.setTargetState.bind(this));

        if(this.stateless || this.device.hasCommand('cycle')) {
            this.currentState.updateValue(Characteristics.CurrentDoorState.CLOSED);
            this.targetState.updateValue(Characteristics.TargetDoorState.CLOSED);
        }
    }

    protected getTargetCommands(value) {
        value = this.reverse ? !value : value;
        if(this.device.hasCommand('cycle')) {
            this.cycle = true;
            return new Command('cycle'); 
        } else {
            return new Command(value ? 'close' : 'open');
        }
    }

    protected async setTargetState(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getTargetCommands(value), callback);
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    if(this.stateless) {
                        this.currentState?.updateValue(value);
                    }
                    if(this.cycle && this.currentState) {
                        const current = this.currentState.value;
                        setTimeout(() => {
                            this.currentState?.updateValue(current);
                            this.targetState?.updateValue(current);
                        }, this.cycleDuration);
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
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.OPEN);
                        if(this.device.isIdle) {
                            this.targetState?.updateValue(Characteristics.TargetDoorState.OPEN);
                        }
                        break;
                    case 'pedestrian' :
                    case 'partial' :
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.STOPPED);
                        if(this.device.isIdle) {
                            this.targetState?.updateValue(Characteristics.TargetDoorState.OPEN);
                        }
                        break;
                    case 'closed' :
                        this.currentState?.updateValue(Characteristics.CurrentDoorState.CLOSED);
                        if(this.device.isIdle) {
                            this.targetState?.updateValue(Characteristics.TargetDoorState.CLOSED);
                        }
                        break;
                }
                break;
        }
    }
}