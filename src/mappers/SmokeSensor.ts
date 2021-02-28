import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class SmokeSensor extends Mapper {
    protected smoke: Characteristic | undefined;
    protected fault: Characteristic | undefined;
    protected battery: Characteristic | undefined;
    
    protected registerServices() {
        const service = this.registerService(this.platform.Service.SmokeSensor);
        this.smoke = service.getCharacteristic(this.platform.Characteristic.SmokeDetected);
        if(this.device.hasState('core:SensorDefectState')) {
            this.fault = service.addCharacteristic(this.platform.Characteristic.StatusFault);
            this.battery = service.addCharacteristic(this.platform.Characteristic.StatusLowBattery);
        }
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:SmokeState':
                this.smoke?.updateValue(
                    value === 'detected' ? 
                        this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED :
                        this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
                    );
                break;
            case 'core:SensorDefectState':
                switch(value) {
                    case 'lowBattery':
                        this.battery?.updateValue(this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                        break;
                    case 'maintenanceRequired':
                    case 'dead':
                        this.fault?.updateValue(this.platform.Characteristic.StatusFault.GENERAL_FAULT);
                        break;
                    case 'noDefect':
                        this.fault?.updateValue(this.platform.Characteristic.StatusFault.NO_FAULT);
                        this.battery?.updateValue(this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                        break;
                }
                break;
        }
    }
}