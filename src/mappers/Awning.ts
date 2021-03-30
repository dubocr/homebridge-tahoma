import RollerShutter from './RollerShutter';
import { Command } from 'overkiz-client';

export default class Awning extends RollerShutter {
    /**
	* Triggered when Homekit try to modify the Characteristic.TargetPosition
	* HomeKit '0' (Close) => 0% Deployment
	* HomeKit '100' (Open) => 100% Deployment
	**/
    protected getTargetCommands(value) {
        if(this.stateless) {
            if(value === 100) {
                return new Command('deploy');
            } else if(value === 0) {
                return new Command('undeploy');
            } else {
                if(this.movementDuration > 0) {
                    const delta = value - Number(this.currentPosition!.value);
                    return new Command(delta > 0 ? 'deploy' : 'undeploy');
                } else {
                    return new Command('my');
                }
            }
        } else {
            return new Command('setDeployment', this.reversedValue(value));
        }
    }

    protected reversedValue(value) {
        return this.reverse ? (100-value) : value;
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:DeploymentState':
                this.currentPosition?.updateValue(this.reversedValue(value));
                if(!this.device.hasState('core:TargetClosureState')) {
                    this.targetPosition?.updateValue(this.reversedValue(value));
                }
                break;
            case 'core:ClosureState':
                this.currentPosition?.updateValue(this.reversedValue(value));
                if(!this.device.hasState('core:TargetClosureState')) {
                    this.targetPosition?.updateValue(this.reversedValue(value));
                }
                break;
            case 'core:TargetClosureState':
                this.targetPosition?.updateValue(this.reversedValue(value));
                if(!this.device.hasState('core:ClosureState')) {
                    this.currentPosition?.updateValue(this.reversedValue(value));
                }
                break;
        }
    }
}