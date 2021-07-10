import { Characteristics } from '../Platform';
import ContactSensor from './ContactSensor';

export default class WindowHandle extends ContactSensor {
    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:ThreeWayHandleDirectionState':
                switch (value) {
                    case 'closed':
                        this.state?.updateValue(Characteristics.ContactSensorState.CONTACT_DETECTED);
                        break;
                    case 'tilt':
                    case 'open':
                        this.state?.updateValue(Characteristics.ContactSensorState.CONTACT_NOT_DETECTED);
                        break;
                }
                break;
            case 'core:OpenClosedState':
                switch (value) {
                    case 'closed':
                        this.state?.updateValue(Characteristics.ContactSensorState.CONTACT_DETECTED);
                        break;
                    case 'open':
                        this.state?.updateValue(Characteristics.ContactSensorState.CONTACT_NOT_DETECTED);
                        break;
                }
                break;
        }
    }
}