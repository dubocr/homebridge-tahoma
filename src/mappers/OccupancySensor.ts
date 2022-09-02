import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class OccupancySensor extends Mapper {
    protected occupancy: Characteristic | undefined;
    protected fault: Characteristic | undefined;
    protected battery: Characteristic | undefined;

    protected registerServices() {
        const motion = this.device.definition.widgetName.startsWith('Motion');
        const service = this.registerService(motion ? Services.MotionSensor : Services.OccupancySensor);
        this.occupancy = service.getCharacteristic(motion ? Characteristics.MotionDetected : Characteristics.OccupancyDetected);
        if (this.device.hasState('core:SensorDefectState')) {
            this.fault = service.getCharacteristic(Characteristics.StatusFault);
            this.battery = service.getCharacteristic(Characteristics.StatusLowBattery);
        }
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:OccupancyState':
                this.occupancy?.updateValue(value === 'personInside');
                break;
            case 'core:SensorDefectState':
                switch (value) {
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