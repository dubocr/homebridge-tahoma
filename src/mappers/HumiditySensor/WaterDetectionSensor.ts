import { Characteristics } from '../../Platform';
import ContactSensor from '../ContactSensor';

export default class WaterDetectionSensor extends ContactSensor {
    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:WaterDetectionState ':
                this.state?.updateValue(
                    value === 'detected' ? 
                        Characteristics.ContactSensorState.CONTACT_DETECTED :
                        Characteristics.ContactSensorState.CONTACT_NOT_DETECTED
                    );
                break;
        }
    }
}