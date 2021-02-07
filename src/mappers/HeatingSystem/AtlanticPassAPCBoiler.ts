import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCBoiler extends HeatingSystem {    
    buildService() {
        this.registerService(this.platform.Service.Thermostat);
    }
}