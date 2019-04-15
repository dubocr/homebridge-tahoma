var Generic, Characteristic, Command, ExecutionState;
Generic = require('./Generic');

module.exports = function(homebridge, log, api) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    return HeaterCooler;
}

class HeaterCooler extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.HeaterCooler(device.getName());
        this.currentState = this.service.getCharacteristic(Characteristic.CurrentHeaterCoolerState);
        this.targetState = this.service.getCharacteristic(Characteristic.TargetHeaterCoolerState);
        
        this.services.push(this.service);
    }
}