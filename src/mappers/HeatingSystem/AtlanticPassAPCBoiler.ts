import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCBoiler extends HeatingSystem {    
    buildServices() {
        this.registerService(this.platform.Service.Thermostat);
    }
}