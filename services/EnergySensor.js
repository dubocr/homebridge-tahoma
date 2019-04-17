var Log, Service, Characteristic;
var AbstractService = require('./AbstractService');
var { Command, ExecutionState } = require('../overkiz-api');
var PowerConsumption, EnergyConsumption;

var inherits = function (ctor, superCtor) {
	if (ctor === undefined || ctor === null)
		throw new TypeError('The constructor to "inherits" must not be null or undefined');

	if (superCtor === undefined || superCtor === null)
		throw new TypeError('The super constructor to "inherits" must not be null or undefined');

	if (superCtor.prototype === undefined)
		throw new TypeError('The super constructor to "inherits" must have a prototype');

	ctor.super_ = superCtor;
	Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}

class EnergySensor extends AbstractService {
	constructor (homebridge, log, device, config) {
        super(homebridge, log, device);
		Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;

		makeCharacteristics();

		this.service = new Service.Outlet(device.getName());
		this.service.addCharacteristic(EnergyConsumption);
		this.service.addCharacteristic(PowerConsumption);
		
		this.energyState = this.service.getCharacteristic(EnergyConsumption);
		this.powerState = this.service.getCharacteristic(PowerConsumption);
	}

	onStateUpdate(name, value) {
		var energyState = null, powerState = null;

		switch(name) {
			case 'core:ElectricEnergyConsumptionState':
				energyState = value / 1000;
			break;
			case 'core:ElectricPowerConsumptionState':
				powerState = value;
			break;
		}

		if (this.energyState != null && energyState != null)
			this.energyState.updateValue(energyState);
		if (this.powerState != null && powerState != null)
			this.powerState.updateValue(powerState);
	}
}    

function makeCharacteristics() {
	PowerConsumption = function() {
	Characteristic.call(this, 'Current Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
	this.setProps({
		format: Characteristic.Formats.INT,
		maxValue: 65535,
		minValue: 0,
		minStep: 1,
		unit: "W",
		perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
	});
	this.value = this.getDefaultValue();
	};
	inherits(PowerConsumption, Characteristic);

	EnergyConsumption = function() {
	Characteristic.call(this, 'Total Consumption', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
	this.setProps({
		format: Characteristic.Formats.FLOAT,
		maxValue: 4294967295,
		minValue: 0,
		minStep: 0.01,
		unit: "kWh",
		perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
	});
	this.value = this.getDefaultValue();
	};
	inherits(EnergyConsumption, Characteristic);
}

module.exports = EnergySensor