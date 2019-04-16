var Log, Service, Characteristic;
var Generic = require('./Generic');
var { Command, ExecutionState } = require('../overkiz-api');

class OccupancySensor extends Generic {
    constructor (homebridge, log, device, config) {
        super(homebridge, log, device, config);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

        this.service = new Service.OccupancySensor(device.getName());
        this.occupancyState = this.service.getCharacteristic(Characteristic.OccupancyDetected);
        this.addService(this.service);
    }

    onStateUpdate(name, value) {
        var occupancyState = null;

        switch(name) {
            case 'core:OccupancyState':
            switch(value) {
                case 'personInside': occupancyState = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
                case 'noPersonInside': occupancyState = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
            }
            break;
        }

        if (this.occupancyState != null && occupancyState != null)
            this.occupancyState.updateValue(occupancyState);
    }
}

module.exports = OccupancySensor