import ContactSensor from '../ContactSensor';

export default class WaterDetectionSensor extends ContactSensor {
    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:WaterDetectionState ':
                this.state?.updateValue(
                    value === 'detected' ? 
                        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED :
                        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
                    );
                break;
        }
    }
}