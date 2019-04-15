var Generic, Characteristic, Command, ExecutionState, UUIDGen;
Generic = require('./Generic');

module.exports = function(homebridge, log, api) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    return Switch;
}


class Switch extends Generic {
    constructor (homebridge, device, config) {
        super(homebridge, device, config);

        this.service = new Service.Switch(device.getName());
        this.onState = this.service.getCharacteristic(Characteristic.On);
        this.onState.on('set', Switch.prototype.setOn.bind(this));
        this.services.push(this.service);
    }

        /**
	* Triggered when Homekit try to modify the Characteristic.On
	**/
    setOn(value, callback) {
        var commands = new Command(value ? 'on' : 'off');
        this.executeCommand(commands, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED: callback(error); break;
                case ExecutionState.IN_PROGRESS: break;
                case ExecutionState.COMPLETED: break;
                case ExecutionState.FAILED:
                    this.onState.updateValue(!value);
                break;
                default: break;
            }
        }.bind(this));
    }
    
    onStateUpdate(name, value) {
        var onState = null;

        switch(name) {
            case 'core:OnOffState':
                onState = value == 'on' ? true : false;
            break;
        }

        if (this.onState != null && onState != null)
            this.onState.updateValue(onState);
    }
}

module.exports = Switch;