var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class Alarm extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;
		
        this.stayZones = config.STAY_ARM || 'A';
        this.nightZones = config.NIGHT_ARM || 'B';
        this.occupancySensor = config.occupancySensor || false;
        
        this.service = new Service.SecuritySystem(device.getName());

        this.currentState = this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState);
        this.targetState = this.service.getCharacteristic(Characteristic.SecuritySystemTargetState);
        this.targetState.on('set', this.setState.bind(this));

        // Store a static shared state for splited alarm component
        if(device.stateless) {
            this.currentState.updateValue(Characteristic.SecuritySystemCurrentState.DISARMED);
            this.targetState.updateValue(Characteristic.SecuritySystemTargetState.DISARM);
        }
        
        var values = [0,1,2,3];
        for(var state of device.definition.states) {
            if(state.qualifiedName == 'myfox:AlarmStatusState')	{
                values = [];
                for(var type of state.values) {
                    switch(type) {
                        case 'armed': values.push(1); break;
                        case 'disarmed': values.push(3); break;
                        case 'partial': values.push(2); break;
                        default: break;
                    }
                }
            }
        }
        this.targetState.setProps({ validValues: values });
    }

    setState(value, callback) {
        var commands = [];
        
        switch(this.device.widget) {
            case 'MyFoxAlarmController':
                switch(value) {
                    default:
                    case Characteristic.SecuritySystemTargetState.STAY_ARM:
                    break;
                    case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                        commands.push(new Command('partial'));
                    break;
                    case Characteristic.SecuritySystemTargetState.AWAY_ARM:
                        commands.push(new Command('arm'));
                    break;
                    case Characteristic.SecuritySystemTargetState.DISARM:
                        commands.push(new Command('disarm'));
                    break;
                }
            break;
            case 'TSKAlarmController':
                switch(value) {
                    default:
                    case Characteristic.SecuritySystemTargetState.STAY_ARM:
                        commands.push(new Command('alarmPartial1'));
                    break;
                    case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                        commands.push(new Command('alarmPartial2'));
                    break;
                    case Characteristic.SecuritySystemTargetState.AWAY_ARM:
                        commands.push(new Command('alarmOn'));
                    break;
                    case Characteristic.SecuritySystemTargetState.DISARM:
                        commands.push(new Command('alarmOff'));
                    break;
                }
            break;
            default:
                switch(value) {
                    default:
                    case Characteristic.SecuritySystemTargetState.STAY_ARM:
                        commands.push(new Command('alarmZoneOn', [this.stayZones]));
                    break;
                    case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                        commands.push(new Command('alarmZoneOn', [this.nightZones]));
                    break;
                    case Characteristic.SecuritySystemTargetState.AWAY_ARM:
                        commands.push(new Command('alarmOn'));
                    break;
                    case Characteristic.SecuritySystemTargetState.DISARM:
                        commands.push(new Command('alarmOff'));
                    break;
                }
            break;
        }
        
        if(commands != null) {
            this.device.executeCommand(commands, function(status, error, data) {
				if(status == ExecutionState.FAILED || status == ExecutionState.COMPLETED) { callback(error); } // HomeKit callback
                switch (status) {
                    case ExecutionState.COMPLETED:
                        if(this.device.stateless) {
                            this.currentState.updateValue(value);
                        }
                    break;
                    case ExecutionState.FAILED:
                        // Restore current state as target
                        if(this.currentState.value != Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED) {
                            this.targetState.updateValue(this.currentState.value);
						}
                    break;
                }
            }.bind(this));
        } else {
            Log("No target command");
        }
    }

    onStateUpdate(name, value) {
		var currentState = null, targetState = null;
		//Log("Update " + name + " => " + value);
        switch(name) {
            case 'core:ActiveZonesState':
                switch(value) {
                    default:
                    case '': 
                    currentState = Characteristic.SecuritySystemCurrentState.DISARMED;
                    targetState = Characteristic.SecuritySystemTargetState.DISARM;
                    break;
                    case this.stayZones: 
                    currentState = Characteristic.SecuritySystemCurrentState.STAY_ARM;
                    targetState = Characteristic.SecuritySystemTargetState.STAY_ARM;
                    break;
                    case 'A,B,C': 
                    currentState = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                    currentState = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                    break;
                    case this.nightZones: 
                    currentState = Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
                    targetState = Characteristic.SecuritySystemTargetState.NIGHT_ARM;
                    break;
                    case 'triggered': 
                    currentState = Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
                    break;
                }
            break;

            case 'internal:CurrentAlarmModeState':
                switch(value) {
                    default:
                    case 'off': currentState = Characteristic.SecuritySystemCurrentState.DISARMED; break;
                    case 'partial1':
                    case 'zone1': currentState = Characteristic.SecuritySystemCurrentState.STAY_ARM; break;
                    case 'total': currentState = Characteristic.SecuritySystemCurrentState.AWAY_ARM; break;
                    case 'partial2':
                    case 'zone2': currentState = Characteristic.SecuritySystemCurrentState.NIGHT_ARM; break;
                }
            break;
            
            case 'internal:TargetAlarmModeState':
                switch(value) {
                    default:
                    case 'off': targetState = Characteristic.SecuritySystemTargetState.DISARM; break;
                    case 'partial1':
                    case 'zone1': targetState = Characteristic.SecuritySystemTargetState.STAY_ARM; break;
                    case 'total': targetState = Characteristic.SecuritySystemTargetState.AWAY_ARM; break;
                    case 'partial2':
                    case 'zone2': targetState = Characteristic.SecuritySystemTargetState.NIGHT_ARM; break;
                }
            break;
            
            case 'myfox:AlarmStatusState':
                switch(value) {
                    default:
                    case 'disarmed':
                    currentState = Characteristic.SecuritySystemCurrentState.DISARMED;
                    targetState = Characteristic.SecuritySystemTargetState.DISARM;
                    break;
                    case 'partial':
                    currentState = Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
                    targetState = Characteristic.SecuritySystemTargetState.NIGHT_ARM;
                    break;
                    case 'armed':
                    currentState = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                    targetState = Characteristic.SecuritySystemTargetState.AWAY_ARM;
                    break;
                }
            break;
        }

        if(this.currentState != null && currentState != null && (this.currentState.value != Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED || targetState == Characteristic.SecuritySystemCurrentState.DISARMED))
            this.currentState.updateValue(currentState);
        if(targetState != null && !this.device.isCommandInProgress())
            this.targetState.updateValue(targetState);
    }
}

module.exports = Alarm