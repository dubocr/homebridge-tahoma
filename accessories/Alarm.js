
module.exports = function(homebridge, log, api) {
    Generic = require('Generic')(homebridge, log, api);
    Characteristic = homebridge.hap.Characteristic;
    return Alarm;
}

class Alarm extends Generic {
    constructor (device, config) {
        super(device, config);
        this.stayZones = config.STAY_ARM || 'A';
        this.nightZones = config.NIGHT_ARM || 'B';
        this.occupancySensor = config.occupancySensor || false;
        
        this.service = new Service.SecuritySystem(device.getName());

        this.currentState = this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState);
        this.targetState = this.service.getCharacteristic(Characteristic.SecuritySystemTargetState);
        this.targetState.on('set', this.setState.bind(this));

        // Store a static shared state for splited alarm component
        if(this.device.stateless) {
            this.currentState.updateValue(Characteristic.SecuritySystemCurrentState.DISARMED);
            this.targetState.updateValue(Characteristic.SecuritySystemTargetState.DISARM);
        }
        this.services.push(this.service);
    }
}    