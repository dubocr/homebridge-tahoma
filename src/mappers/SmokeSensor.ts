import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';

export default class SmokeSensor extends Mapper {
    protected smoke: Characteristic | undefined;
    protected active: Characteristic | undefined;
    protected fault: Characteristic | undefined;
    protected battery: Characteristic | undefined;

    protected registerMainService() {
        const service = this.registerService(Services.SmokeSensor);
        this.smoke = service.getCharacteristic(Characteristics.SmokeDetected);
        if (
            this.device.hasState('core:SensorDefectState') ||
            this.device.hasState('io:SensorDefMaintenanceSensorPartBatteryStateectState') ||
            this.device.hasState('io:MaintenanceRadioPartBatteryState') ||
            this.device.hasState('io:SensorRoomState')
        ) {
            this.fault = service.getCharacteristic(Characteristics.StatusFault);
            this.battery = service.getCharacteristic(Characteristics.StatusLowBattery);
        }
        if (this.device.hasState('core:StatusState')) {
            this.active = service.getCharacteristic(Characteristics.StatusActive);
        }
        return service;
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:StatusState':
                this.active?.updateValue(value === 'available');
                break;
            case 'core:SmokeState':
                this.smoke?.updateValue(value === 'detected');
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
            case 'io:MaintenanceRadioPartBatteryState':
            case 'io:MaintenanceSensorPartBatteryState':
                switch (value) {
                    case 'absence':
                    case 'normal':
                        this.battery?.updateValue(Characteristics.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                        break;
                    case 'low':
                        this.battery?.updateValue(Characteristics.StatusLowBattery.BATTERY_LEVEL_LOW);
                        break;
                }
                break;
            case 'io:SensorRoomState':
                switch (value) {
                    case 'clean':
                        this.fault?.updateValue(Characteristics.StatusFault.NO_FAULT);
                        break;
                    case 'dirty':
                        this.fault?.updateValue(Characteristics.StatusFault.GENERAL_FAULT);
                        break;
                }
                break;
        }
    }
}