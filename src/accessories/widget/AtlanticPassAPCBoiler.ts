import HeatingSystem from '../uiClass/HeatingSystem';

export default class AtlanticPassAPCBoiler extends HeatingSystem {    
    build() {
        this.registerService(this.platform.Service.Thermostat);
    }
}