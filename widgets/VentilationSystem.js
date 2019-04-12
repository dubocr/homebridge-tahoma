var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return VentilationSystem;
}

/**
 * Accessory "VentilationSystem"
 */
 
VentilationSystem = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.HeaterCooler(device.label);

    this.currentState = service.getCharacteristic(Characteristic.CurrentHeaterCoolerState);
    this.targetState = service.getCharacteristic(Characteristic.TargetHeaterCoolerState)
    this.targetState.on('set', this.setStatus.bind(this));

    this.services.push(service);
};

VentilationSystem.UUID = 'VentilationSystem';

 // TODO : Not implemented
VentilationSystem.prototype = {
    
    /**
	* Triggered when Homekit try to modify the Characteristic.TargetHeaterCoolerState
	**/
    setStatus: function(value, callback) {
        var that = this;
        
        var command = new Command('setAirDemandMode');
		switch(value) {
			case Characteristic.TargetHeaterCoolerState.AUTO:
				command.parameters = ['auto'];
			break;
			case Characteristic.TargetHeaterCoolerState.HEAT:
			case Characteristic.TargetHeaterCoolerState.COOL:
				 command.parameters = ['boost'];
			break;
		}
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
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
        if (name == 'io:VentilationConfigurationModeState') {
        	var converted = null;
        	switch(value) {
        		default:
        			converted = Characteristic.CurrentHeaterCoolerState.INACTIVE;
        		break;
        	}
        	this.currentState.updateValue(converted);
        }
    }
}