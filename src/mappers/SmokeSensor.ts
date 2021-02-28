import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class SmokeSensor extends Mapper {
    protected smoke: Characteristic | undefined;
    protected fault: Characteristic | undefined;
    protected battery: Characteristic | undefined;
    
    protected registerServices() {
        const service = this.registerService(Services.SmokeSensor);
        this.smoke = service.getCharacteristic(Characteristics.SmokeDetected);
        if(this.device.hasState('core:SensorDefectState')) {
            this.fault = service.addCharacteristic(Characteristics.StatusFault);
            this.battery = service.addCharacteristic(Characteristics.StatusLowBattery);
        }
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:SmokeState':
                this.smoke?.updateValue(value === 'detected');
                break;
            case 'core:SensorDefectState':
                switch(value) {
                    case 'lowBattery':
                        this.battery?.updateValue(Characteristics.StatusLowBattery.BATTERY_LEVEL_LOW);
                        break;
                    case 'maintenanceRequired':
                    case 'dead':
                        this.fault?.updateValue(Characteristics.StatusFault.GENERAL_FAULT);
                        break;
                    case 'noDefect':
                        this.fault?.updateValue(Characteristics.StatusFault.NO_FAULT);
                        this.battery?.updateValue(Characteristics.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                        break;
                }
                break;
        }
    }
}