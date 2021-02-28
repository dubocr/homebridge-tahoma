import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import RollerShutter from './RollerShutter';

export default class VenetianBlind extends RollerShutter {
    protected currentAngle: Characteristic | undefined;
    protected targetAngle: Characteristic | undefined;
    
    protected blindMode;
    
    protected applyConfig(config) {
        super.applyConfig(config);
        this.blindMode = config['blindMode'] || false;
    }

    protected registerServices() {
        super.registerServices();

        if(!this.blindMode) {
            const service = this.accessory.getService(this.platform.Service.WindowCovering);
            if(service) {
                this.currentAngle = this.registerCharacteristic(service, this.platform.Characteristic.CurrentHorizontalTiltAngle);
                this.targetAngle = this.registerCharacteristic(service, this.platform.Characteristic.TargetHorizontalTiltAngle);
                this.targetAngle?.setProps({ minStep: 10 });
                this.targetAngle?.on('set', this.debounce(this.setTargetAnglePosition));
            }
        }
    }

    protected getTargetCommands(value) {
        if(!this.blindMode) {
            return super.getTargetCommands(value);
        } else {
            if(value < 100) {
                return new Command('setClosureAndOrientation', [100, this.reversedValue(value)]);
            } else {
                return new Command('setClosure', this.reversedValue(value));
            }
        }
    }

    protected getTargetAngleCommands(value) {
        if(this.targetPosition?.getValue() === this.currentPosition?.getValue()) {
            const orientation = Math.round((value + 90)/1.8);
            return new Command('setOrientation', orientation);
        } else {
            const orientation = Math.round((value + 90)/1.8);
            const closure = this.reversedValue((this.targetPosition?.getValue() || 0));
            return new Command('setClosureAndOrientation', [closure, orientation]);
        }
    }

    async setTargetAnglePosition(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getTargetAngleCommands(value), callback);
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.FAILED:
                    this.targetAngle?.updateValue(this.currentAngle?.value || 0); 
                    break;
            }
        });
    }

    protected onStateChanged(name, value) {
        let currentPosition;
        let targetPosition;
        let currentAngle;
        let targetAngle;

        switch(name) {
            case 'core:DeploymentState':
                currentPosition = this.reverse ? (100 - value) : value;
                targetPosition = currentPosition;
                break;

            case 'core:TargetClosureState':
            case 'core:ClosureState':
                if(value === 99) {
                    value = 100;
                } // Workaround for io:RollerShutterVeluxIOComponent remains 1% opened
                currentPosition = this.reverse ? value : (100 - value);
                targetPosition = currentPosition;
                break;

            case 'core:SlateOrientationState':
                currentAngle = Math.round(value * 1.8 - 90);
                targetAngle = currentAngle;
                break;


            case 'core:SlatsOrientationState':
                currentPosition = this.reverse ? (100 - value) : value;
                targetPosition = currentPosition;
                currentAngle = Math.round(value * 1.8 - 90);
                targetAngle = currentAngle;
                break;

            case 'core:OpenClosedPedestrianState':
            case 'core:OpenClosedUnknownState':
            case 'core:OpenClosedPartialState':
                currentPosition = value === 'closed' ? 0 : 100;
                targetPosition = currentPosition;
                break;

            default: break;
        }

        if(this.blindMode === 'orientation' && ['core:OpenClosedState', 'core:SlateOrientationState'].includes(name)) {
            if(this.device.get('core:OpenClosedState') === 'closed') {
                const orientation = this.reversedValue(this.device.get('core:SlateOrientationState'));
                if(Number.isInteger(orientation)) {
                    currentPosition = orientation;
                    const t = this.targetPosition?.getValue() ||0;
                    if(Math.round(orientation/5) === Math.round(t/5)) {
                        this.targetPosition?.updateValue(orientation);
                    }
                }
            } else {
                currentPosition = 0;
            }
            targetPosition = currentPosition;
        }

        if(currentPosition !== undefined) {
            this.currentPosition?.updateValue(currentPosition);
        }
        if(!this.device.isCommandInProgress() && targetPosition !== undefined) {
            this.targetPosition?.updateValue(targetPosition);
        }
    }
}