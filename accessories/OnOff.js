var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return OnOff;
}

/**
 * Accessory "OnOff"
 */
 
OnOff = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.Switch(device.label);

    this.onState = service.getCharacteristic(Characteristic.On);
    this.onState.on('set', this.setOn.bind(this));
    
    this.services.push(service);
};

OnOff.UUID = 'OnOff';

OnOff.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.On
	**/
    setOn: function(value, callback) {
        var that = this;
        
        var command = new Command('setOnOff');
        command.parameters = value ? ['on'] : ['off'];
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.IN_PROGRESS:
                    break;
                case ExecutionState.COMPLETED:
                	break;
                case ExecutionState.FAILED:
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
        if (name == 'core:OnOffState') {
        	this.onState.updateValue(value == 'on' ? true : false);
        }
    }
}