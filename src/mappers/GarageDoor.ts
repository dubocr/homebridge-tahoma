import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command } from 'overkiz-client';
import Mapper from '../Mapper';

export default class GarageDoor extends Mapper {
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected reverse = false;

    protected registerServices() {
        const service = this.registerService(this.platform.Service.GarageDoorOpener);
        this.currentState = service.getCharacteristic(this.platform.Characteristic.CurrentDoorState);
        this.targetState = service.getCharacteristic(this.platform.Characteristic.TargetDoorState);
        this.targetState.on('set', this.setTargetState);
    }

    protected setTargetState(value, callback: CharacteristicSetCallback) {
        value = this.reverse ? 
            (
                value === this.platform.Characteristic.TargetDoorState.OPEN ? 
                    this.platform.Characteristic.TargetDoorState.CLOSED : this.platform.Characteristic.TargetDoorState.OPEN
            ) : value;
        this.getTargetCommands(value);
    }

    protected getTargetCommands(value) {
        return new Command(value === this.platform.Characteristic.TargetDoorState.OPEN ? 'open' : 'close');
    }

    onStateChange(name: string, value) {
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