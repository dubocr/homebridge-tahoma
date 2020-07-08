import HeatingSystem from '../uiClass/HeatingSystem';

export default class AtlanticPassAPCBoiler extends HeatingSystem {    
    build() {
        const service = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat);
        const service2 = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
        const service3 = this.accessory.getServiceByUUIDAndSubType(this.platform.Service.Thermostat, 'ecs') || this.accessory.addService(this.platform.Service.Thermostat, 'ecs', 'ecs');
    }
}