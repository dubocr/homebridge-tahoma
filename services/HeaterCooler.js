var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class HeaterCooler extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.HeaterCooler(device.getName());
        this.currentState = this.service.getCharacteristic(Characteristic.CurrentHeaterCoolerState);
        this.targetState = this.service.getCharacteristic(Characteristic.TargetHeaterCoolerState);
        this.targetState.on('set', this.setStatus.bind(this));
		
		switch(device.widget) {
            case 'DimplexVentilationInletOutlet'://COULD BE REMOVED
				this.targetState.setProps({ validValues: [0,2] });
			break;
		}
    }

    /**
	* Triggered when Homekit try to modify the Characteristic.TargetHeaterCoolerState
	**/
    setStatus(value, callback) {
        var commands = [];
       
		switch(this.device.widget) {
			case 'DimplexVentilationInletOutlet'://COULD BE REMOVED
			switch(value) {
				case Characteristic.TargetHeaterCoolerState.AUTO:
					commands = new Command('auto');
				break;
				case Characteristic.TargetHeaterCoolerState.COOL:
					commands = new Command('max');
				break;
			}
			break;
		}
        this.device.executeCommand(commands, function(status, error, data) {
			if(status == ExecutionState.FAILED || status == ExecutionState.COMPLETED) { callback(error); } // HomeKit callback
            switch (status) {
                case ExecutionState.FAILED:
                    this.targetState.updateValue(this.currentState.value);
                break;
            }
        }.bind(this));
    }

    onStateUpdate(name, value) {
        var currentState = null, targetState = null;

        switch(name) {
            case 'io:VentilationConfigurationModeState':
                currentState = Characteristic.CurrentHeaterCoolerState.INACTIVE;
            break;
        }
        
        if(this.currentState != null && currentState != null)
            this.currentState.updateValue(currentState);
        if(!this.device.isCommandInProgress() && this.targetState != null && targetState != null)
            this.targetState.updateValue(targetState);
    }
}

module.exports = HeaterCooler