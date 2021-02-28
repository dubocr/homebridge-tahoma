import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class ContactSensor extends Mapper {
    protected state: Characteristic | undefined;
    
    protected registerServices() {
        const service = this.registerService(this.platform.Service.ContactSensor);
        this.state = service.getCharacteristic(this.platform.Characteristic.ContactSensorState);
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:ContactState':
                switch(value) {
                    case 'closed':
                        this.state?.updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
                        break;
                    case 'tilt':
                    case 'open': 
                        this.state?.updateValue(this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
                        break;
                }
                break;
        }
    }
}