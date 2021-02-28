import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class OccupancySensor extends Mapper {
    protected occupancy: Characteristic | undefined;
    protected fault: Characteristic | undefined;
    protected battery: Characteristic | undefined;
    
    protected registerServices() {
        const motion = this.device.widget.startsWith('Motion');
        const service = this.registerService(motion ? this.platform.Service.MotionSensor : this.platform.Service.OccupancySensor);
        this.occupancy = service.getCharacteristic(motion ? this.platform.Characteristic.MotionDetected : this.platform.Characteristic.OccupancyDetected);
        if(this.device.hasState('core:SensorDefectState')) {
            this.fault = service.addCharacteristic(this.platform.Characteristic.StatusFault);
            this.battery = service.addCharacteristic(this.platform.Characteristic.StatusLowBattery);
        }
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:OccupancyState':
                this.occupancy?.updateValue(value === 'personInside');
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