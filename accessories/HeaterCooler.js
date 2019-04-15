
module.exports = function(homebridge, log, api) {
    Generic = require('Generic')(homebridge, log, api);
    Characteristic = homebridge.hap.Characteristic;
    return HeaterCooler;
}

class HeaterCooler extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.HeaterCooler(device.getName());
        this.currentState = service.getCharacteristic(Characteristic.CurrentHeaterCoolerState);
        this.targetState = service.getCharacteristic(Characteristic.TargetHeaterCoolerState);
        
        this.services.push(this.service);
    }
}