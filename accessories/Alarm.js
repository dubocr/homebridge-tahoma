var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

var sharedCurrentState, sharedTargetState, initCurrentState, initTargetState;

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;

    return Alarm;
}

/**
 * Accessory "Alarm"
 */
 
Alarm = function(log, api, device, config) {
    AbstractAccessory.call(this, log, api, device);
    
    this.stayZones = config.STAY_ARM || 'A';
    this.nightZones = config.NIGHT_ARM || 'B';
    this.occupancySensor = config.occupancySensor || false;
    
	var service = new Service.SecuritySystem(device.label);
	this.currentState = service.getCharacteristic(Characteristic.SecuritySystemCurrentState);
	this.targetState = service.getCharacteristic(Characteristic.SecuritySystemTargetState);
	this.targetState.on('set', this.setState.bind(this));

	// Store a static shared state for splited alarm component
	if(this.device.widget == 'StatelessAlarmController') {
		this.currentState.updateValue(Characteristic.SecuritySystemCurrentState.DISARMED);
		this.targetState.updateValue(Characteristic.SecuritySystemTargetState.DISARM);
	}
	this.services.push(service);
	
	
	if(this.device.widget == 'MyFoxAlarmController') {
		if(this.occupancySensor) {
			var service2 = new Service.OccupancySensor(device.label);
    		this.occupancyState = service2.getCharacteristic(Characteristic.OccupancyDetected);
    		this.services.push(service2);
    	}
	}
};

Alarm.UUID = 'Alarm';

Alarm.prototype = {

	/**
	* Triggered when Homekit try to modify the Characteristic.SecuritySystemTargetState
	**/
    setState: function(value, callback) {
        var that = this;
        var command = null;
        
        if(this.device.widget == 'MyFoxAlarmController') {
        	switch(value) {
				default:
				case Characteristic.SecuritySystemTargetState.STAY_ARM:
					command = new Command('partial');
				break;
				case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
					command = new Command('partial');
				break;
				case Characteristic.SecuritySystemTargetState.AWAY_ARM:
					command = new Command('arm');
				break;
				case Characteristic.SecuritySystemTargetState.DISARM:
					 command = new Command('disarm');
				break;
			}
        } else {
			switch(value) {
				default:
				case Characteristic.SecuritySystemTargetState.STAY_ARM:
					command = new Command('alarmZoneOn', [this.stayZones]);
				break;
				case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
					command = new Command('alarmZoneOn', [this.nightZones]);
				break;
				case Characteristic.SecuritySystemTargetState.AWAY_ARM:
					command = new Command('alarmOn');
				break;
				case Characteristic.SecuritySystemTargetState.DISARM:
					 command = new Command('alarmOff');
				break;
			}
		}
        this.executeCommand(command, function(status, error, data) {
            switch (status) {
                case ExecutionState.INITIALIZED:
                    callback(error);
                    break;
                case ExecutionState.COMPLETED:
                	if(that.device.widget == 'StatelessAlarmController') {
                		that.currentState.updateValue(value);
                	}
                	break;
                case ExecutionState.FAILED:
                	// Restore current state as target
                    that.targetState.updateValue(that.currentState.value != Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED ? that.currentState.value : null);
                    break;
                default:
                    break;
            }
        });
    },

    onStateUpdate: function(name, value) {
    	if (name == State.STATE_ACTIVE_ZONES) {
        	var converted = null;
        	var target = null;
            switch(value) {
				default:
				case '': target = converted = Characteristic.SecuritySystemCurrentState.DISARMED; break;
				case this.stayZones: target = converted = Characteristic.SecuritySystemCurrentState.STAY_ARM; break;
				case 'A,B,C': target = converted = Characteristic.SecuritySystemCurrentState.AWAY_ARM; break;
				case this.nightZones: target = converted = Characteristic.SecuritySystemCurrentState.NIGHT_ARM; break;
				case 'triggered': converted = Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED; break;
			}

            this.currentState.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetState.updateValue(target);
        } else if (name == 'internal:CurrentAlarmModeState') {
        	var converted = null;
            switch(value) {
				default:
				case 'off': converted = Characteristic.SecuritySystemCurrentState.DISARMED; break;
				case 'partial1': converted = Characteristic.SecuritySystemCurrentState.STAY_ARM; break;
				case 'total': converted = Characteristic.SecuritySystemCurrentState.AWAY_ARM; break;
				case 'partial2': converted = Characteristic.SecuritySystemCurrentState.NIGHT_ARM; break;
			}
			this.currentState.updateValue(converted);
        } else if (name == 'internal:TargetAlarmModeState') {
        	var converted = null;
            switch(value) {
				default:
				case 'off': converted = Characteristic.SecuritySystemTargetState.DISARM; break;
				case 'partial1': converted = Characteristic.SecuritySystemTargetState.STAY_ARM; break;
				case 'total': converted = Characteristic.SecuritySystemTargetState.AWAY_ARM; break;
				case 'partial2': converted = Characteristic.SecuritySystemTargetState.NIGHT_ARM; break;
			}
			this.targetState.updateValue(converted);
        } else if (name == 'myfox:AlarmStatusState') {
        	var converted = null;
        	var target = null;
            switch(value) {
				default:
				case 'disarmed': target = converted = Characteristic.SecuritySystemTargetState.DISARM; break;
				case 'partial': target = converted = Characteristic.SecuritySystemTargetState.STAY_ARM; break;
				case 'armed': target = converted = Characteristic.SecuritySystemTargetState.AWAY_ARM; break;
			}
			this.currentState.updateValue(converted);
            if (!this.isCommandInProgress()) // if no command running, update target
                this.targetState.updateValue(target);
        } else if (name == 'core:IntrusionState' || name == 'core:IntrusionDetectedState') {
        	if(this.occupancyState != null) {
        		this.occupancyState.updateValue(value == 'detected' ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
        	}
        	if(value == 'detected') {
        		this.currentState.updateValue(Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
        	}
        }
    }
}