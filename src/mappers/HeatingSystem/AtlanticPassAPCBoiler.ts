import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCBoiler extends HeatingSystem {    
    build() {
        this.registerService(this.platform.Service.Thermostat);
    }
}