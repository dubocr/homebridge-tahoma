var { Log, Service, Characteristic, Command, ExecutionState, Generic } = require('./Generic');

class AirQualitySensor extends Generic {
    constructor (device, config) {
        super(device, config);

        this.service = new Service.AirQualitySensor(device.getName());

        this.service.addCharacteristic(Characteristic.CarbonDioxideLevel);
        this.co2State = this.service.getCharacteristic(Characteristic.CarbonDioxideLevel);
        this.services.push(this.service);
    }

    onStateUpdate(name, value) {
        var co2State = null;

        switch(name) {
            case 'core:CO2ConcentrationState':
            co2State = value;
            break;
        }

        if (this.co2State != null && co2State != null)
            this.co2State.updateValue(co2State);
    }
}

module.exports = AirQualitySensor