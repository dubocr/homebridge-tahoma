var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');

class OccupancySensor extends AbstractService {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.OccupancySensor(device.getName());
        this.occupancyState = this.service.getCharacteristic(Characteristic.OccupancyDetected);
    }

    onStateUpdate(name, value) {
        var occupancyState = null;

        switch(name) {
            case 'core:OccupancyState':
				switch(value) {
					case 'personInside': occupancyState = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED; break;
					case 'noPersonInside': occupancyState = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED; break;
				}
            break;
			
            case 'core:IntrusionState':
            case 'core:IntrusionDetectedState':
				switch(value) {
					case 'detected':
						occupancyState = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
					break;
					default :
						occupancyState = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
					break
				}
            break;
        }

        if (this.occupancyState != null && occupancyState != null)
            this.occupancyState.updateValue(occupancyState);
    }
}

module.exports = OccupancySensor