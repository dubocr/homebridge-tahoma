
import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class VentilationSystem extends Mapper {
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(this.platform.Service.LockMechanism);
        this.currentState = service.getCharacteristic(this.platform.Characteristic.LockCurrentState);
        this.targetState = service.getCharacteristic(this.platform.Characteristic.LockTargetState);

        this.targetState?.on('set', this.setTargetState.bind(this));
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch(value) {
            case this.platform.Characteristic.LockTargetState.SECURED:
                return new Command('setLockedUnlocked', 'locked');
            case this.platform.Characteristic.LockTargetState.UNSECURED:
            default:
                return new Command('setLockedUnlocked', 'unlocked');
        }
    }

    protected async setTargetState(value, callback) {
        const action = await this.executeCommands(this.getTargetStateCommands(value), callback);
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    if(this.stateless) {
                        this.currentState?.updateValue(value);
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
            case 'core:LockedUnlockedState':
                switch(value) {
                    case 'locked':
                        this.currentState?.updateValue(this.platform.Characteristic.LockCurrentState.SECURED);
                        break;
                    default:
                        this.currentState?.updateValue(this.platform.Characteristic.LockCurrentState.UNSECURED);
                        break;
                }
                break;
        }
    }
}