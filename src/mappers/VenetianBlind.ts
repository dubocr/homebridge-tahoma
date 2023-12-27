import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
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

    protected registerMainService() {
        const service = super.registerMainService();

        if (!this.stateless) {
            this.currentAngle = service?.getCharacteristic(Characteristics.CurrentHorizontalTiltAngle);
            this.targetAngle = service?.getCharacteristic(Characteristics.TargetHorizontalTiltAngle);
            this.targetAngle?.setProps({ minStep: 10 });
            this.targetAngle?.onSet(this.debounce(this.setTargetAnglePosition));

            if (this.blindMode && this.currentAngle) {
                service?.removeCharacteristic(this.currentAngle);
            }
            if (this.blindMode && this.targetAngle) {
                service?.removeCharacteristic(this.targetAngle);
            }
        }
        return service;
    }

    protected orientationToAngle(value) {
        return Math.round((value * 1.8) - 90);
    }

    protected angleToOrientation(value) {
        return Math.round((value + 90) / 1.8);
    }

    protected getTargetCommands(value): Command | Command[] {
        if (this.stateless) {
            if (value === 100) {
                return new Command('open');
            } else if (value === 0) {
                return new Command('close');
            } else {
                if (this.movementDuration > 0) {
                    const delta = value - Number(this.currentPosition!.value);
                    return new Command(delta > 0 ? 'open' : 'close');
                } else {
                    return new Command('my');
                }
            }
        } else if (this.blindMode) {
            if (value === 100) {
                return new Command('open');
            } else if (this.device.hasCommand('setClosureAndOrientation')) {
                return new Command('setClosureAndOrientation', [100, this.reversedValue(value)]);
            } else {
                return [
                    new Command('setClosure', 100),
                    new Command('setOrientation', this.reversedValue(value)),
                ];
            }
        } else if (this.device.hasCommand('setClosureAndOrientation')) {
            return new Command('setClosureAndOrientation', [
                this.reversedValue(value),
                this.angleToOrientation(this.targetAngle?.value),
            ]);
        } else {
            const commands = [
                new Command('setClosure', this.reversedValue(value)),
            ];
            if (this.device.hasCommand('setOrientation')) {
                commands.push(new Command('setOrientation', this.angleToOrientation(this.targetAngle?.value)));
            }
            return commands;
        }
    }

    protected getTargetAngleCommands(value) {
        if (this.stateless) {
            return [];
        } else if (this.device.hasCommand('setClosureAndOrientation')) {
            return new Command('setClosureAndOrientation', [
                this.reversedValue(this.targetPosition?.value),
                this.angleToOrientation(value),
            ]);
        } else {
            const commands = [
                new Command('setClosure', this.reversedValue(this.targetPosition?.value)),
            ];
            if (this.device.hasCommand('setOrientation')) {
                commands.push(new Command('setOrientation', this.angleToOrientation(value)));
            }
            return commands;
        }
    }

    async setTargetAnglePosition(value) {
        const action = await this.executeCommands(this.getTargetAngleCommands(value));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.FAILED:
                    if (this.currentAngle) {
                        this.targetAngle?.updateValue(this.currentAngle.value);
                    }
                    break;
            }
        });
    }

    protected onStateChanged(name, value) {
        if (this.blindMode) {
            switch (name) {
                case 'core:OpenClosedState':
                case 'core:SlateOrientationState':
                    if (this.device.get('core:OpenClosedState') === 'closed') {
                        const position = this.reversedValue(this.device.get('core:SlateOrientationState'));
                        const target = Number(this.targetPosition?.value);
                        if (Number.isInteger(position)) {
                            this.currentPosition?.updateValue(position);
                            if (this.isIdle || Math.round(position / 5) === Math.round(target / 5)) {
                                this.targetPosition?.updateValue(position);
                            }
                        }
                    } else {
                        this.currentPosition?.updateValue(100);
                        if (this.isIdle) {
                            this.targetPosition?.updateValue(100);
                        }
                    }
                    break;
                default: break;
            }
        } else {
            super.onStateChanged(name, value);

            switch (name) {
                case 'core:SlateOrientationState':
                    this.currentAngle?.updateValue(this.orientationToAngle(value));
                    if (this.isIdle) {
                        this.targetAngle?.updateValue(this.orientationToAngle(value));
                    }
                    break;
                default: break;
            }
        }
    }
}
