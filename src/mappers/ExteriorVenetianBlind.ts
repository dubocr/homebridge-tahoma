import RollerShutter from './RollerShutter';

export default class ExteriorVenetianBlind extends RollerShutter {

    protected onStateChange(name, value) {
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

        if(this.config.blindMode === 'orientation' && ['core:OpenClosedState', 'core:SlateOrientationState'].includes(name)) {
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