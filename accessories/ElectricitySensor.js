var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

var PowerConsumption, EnergyConsumption;

var inherits = function (ctor, superCtor) {

  if (ctor === undefined || ctor === null)
    throw new TypeError('The constructor to "inherits" must not be ' +
                        'null or undefined');

  if (superCtor === undefined || superCtor === null)
    throw new TypeError('The super constructor to "inherits" must not ' +
                        'be null or undefined');

  if (superCtor.prototype === undefined)
    throw new TypeError('The super constructor to "inherits" must ' +
                        'have a prototype');

  ctor.super_ = superCtor;
  Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}

module.exports = function(homebridge, abstractAccessory, api) {
    AbstractAccessory = abstractAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
    ExecutionState = api.ExecutionState;
    State = api.State;
		
	makeCharacteristics();
		
    return ElectricitySensor;
}

/**
 * Accessory "ElectricitySensor"
 */
 
ElectricitySensor = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service.Outlet(device.label);
	service.addCharacteristic(EnergyConsumption);
	service.addCharacteristic(PowerConsumption);
		
    this.energyState = service.getCharacteristic(EnergyConsumption);
    this.powerState = service.getCharacteristic(PowerConsumption);
    
    this.services.push(service);
};

ElectricitySensor.UUID = 'ElectricitySensor';

ElectricitySensor.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:ElectricEnergyConsumptionState') {
            this.energyState.updateValue(value);
        } else if (name == 'core:ElectricPowerConsumptionState') {
            this.powerState.updateValue(value);
        }
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