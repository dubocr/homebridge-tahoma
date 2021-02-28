
import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class VentilationSystem extends Mapper {
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(Services.LockMechanism);
        this.currentState = service.getCharacteristic(Characteristics.LockCurrentState);
        this.targetState = service.getCharacteristic(Characteristics.LockTargetState);

        this.targetState?.on('set', this.setTargetState.bind(this));
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch(value) {
            case Characteristics.LockTargetState.SECURED:
                return new Command('setLockedUnlocked', 'locked');
            case Characteristics.LockTargetState.UNSECURED:
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
                        this.currentState?.updateValue(Characteristics.LockCurrentState.SECURED);
                        break;
                    default:
                        this.currentState?.updateValue(Characteristics.LockCurrentState.UNSECURED);
                        break;
                }
                if(this.device.isIdle && this.currentState) {
                    this.targetState?.updateValue(this.currentState.value);
                }
                break;
        }
    }
}