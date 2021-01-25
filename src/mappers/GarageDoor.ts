import { CharacteristicValue } from 'homebridge';
import Mapper from '../Mapper';

export default class GarageDoor extends Mapper {
    protected currentState;
    protected targetState;

    buildServices() {
        const service = this.registerService(this.platform.Service.GarageDoorOpener);
        this.currentState = service.getCharacteristic(this.platform.Characteristic.CurrentDoorState);
        this.targetState = service.getCharacteristic(this.platform.Characteristic.TargetDoorState);
        service.getCharacteristic(this.platform.Characteristic.TargetPosition).on('set', (value, callabck) => {
            this.platform.log.debug('Target: ' + value);
            callabck('Unable to connect');
        });
    }

    onStateUpdate(name: string, value) {
        let currentState: CharacteristicValue|null = null;
        let targetState: CharacteristicValue|null = null;

        switch(name) {
            case 'core:OpenClosedPedestrianState':
            case 'core:OpenClosedUnknownState':
            case 'core:OpenClosedState':
            case 'core:OpenClosedPartialState':
                switch(value) {
                    case 'unknown':
                    case 'open' :
                        currentState = this.platform.Characteristic.CurrentDoorState.OPEN;
                        targetState = this.platform.Characteristic.TargetDoorState.OPEN;
                        break;
                    case 'pedestrian' :
                    case 'partial' :
                        currentState = this.platform.Characteristic.CurrentDoorState.STOPPED;
                        targetState = this.platform.Characteristic.TargetDoorState.OPEN;
                        break;
                    case 'closed' :
                        currentState = this.platform.Characteristic.CurrentDoorState.CLOSED;
                        targetState = this.platform.Characteristic.TargetDoorState.CLOSED;
                        break;
                }
                break;
        }

        if(this.currentState !== null && currentState !== null) {
            this.currentState.updateValue(currentState);
        }
        if(!this.device.isCommandInProgress() && this.targetState !== null && targetState !== null) {
            this.targetState.updateValue(targetState);
        }
    }
}