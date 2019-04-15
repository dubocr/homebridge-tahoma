
module.exports = function(homebridge, log, api) {
    Generic = require('Generic')(homebridge, log, api);
    Characteristic = homebridge.hap.Characteristic;
    return OccupancySensor;
}

class OccupancySensor extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.OccupancySensor(device.getName());
        this.occupancyState = this.service.getCharacteristic(Characteristic.OccupancyDetected);
        this.services.push(this.service);
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