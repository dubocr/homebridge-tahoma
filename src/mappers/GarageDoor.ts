import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class GarageDoor extends Mapper {
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected cycle = false;
    protected reverse = false;

    protected registerServices() {
        const service = this.registerService(this.platform.Service.GarageDoorOpener);
        this.currentState = service.getCharacteristic(this.platform.Characteristic.CurrentDoorState);
        this.targetState = service.getCharacteristic(this.platform.Characteristic.TargetDoorState);
        this.targetState.on('set', this.setTargetState.bind(this));
    }

    protected getTargetCommands(value) {
        value = this.reverse ? !value : value;
        return new Command(value ? 'open' : 'close');
    }

    protected async setTargetState(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getTargetCommands(value), callback);
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    this.currentState?.updateValue(value);
                    if(this.cycle) {
                        setTimeout(() => {
                            this.currentState?.updateValue(!value);
                            this.targetState?.updateValue(!value);
                        }, 5000);
                    }
                    break;
                case ExecutionState.FAILED:
                    this.targetState?.updateValue(!value);
                    break;
            }
        });
    }

    protected onStateChange(name: string, value) {
        switch(name) {
            case 'core:OpenClosedPedestrianState':
            case 'core:OpenClosedUnknownState':
            case 'core:OpenClosedState':
            case 'core:OpenClosedPartialState':
                switch(value) {
                    case 'unknown':
                    case 'open' :
                        this.currentState?.updateValue(this.platform.Characteristic.CurrentDoorState.OPEN);
                        if(this.device.isIdle) {
                            this.targetState?.updateValue(this.platform.Characteristic.TargetDoorState.OPEN);
                        }
                        break;
                    case 'pedestrian' :
                    case 'partial' :
                        this.currentState?.updateValue(this.platform.Characteristic.CurrentDoorState.STOPPED);
                        if(this.device.isIdle) {
                            this.targetState?.updateValue(this.platform.Characteristic.TargetDoorState.OPEN);
                        }
                        break;
                    case 'closed' :
                        this.currentState?.updateValue(this.platform.Characteristic.CurrentDoorState.CLOSED);
                        if(this.device.isIdle) {
                            this.targetState?.updateValue(this.platform.Characteristic.TargetDoorState.CLOSED);
                        }
                        break;
                }
                break;
        }
    }
}