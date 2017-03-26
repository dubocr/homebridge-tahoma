var Service, Characteristic, Command, ExecutionState, State, AbstractAccessory;

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

	makeEnergyCharacteristic();
	makeConsumptionCharacteristic();
	makeEnergyService();
	
    return ElectricitySensor;
}

/**
 * Accessory "ElectricitySensor"
 */
 
ElectricitySensor = function(log, api, device) {
    AbstractAccessory.call(this, log, api, device);
    var service = new Service(device.label);
    
    this.energyState = service.getCharacteristic(EnergyCharacteristic);
    this.consumtionState = service.getCharacteristic(ConsumptionCharacteristic);
    
    this.services.push(service);
};

ElectricitySensor.UUID = 'ElectricitySensor';

ElectricitySensor.prototype = {

    onStateUpdate: function(name, value) {
        if (name == 'core:ElectricalEnergyInKWh') {
            this.energyState.updateValue(value);
        } else if (name == 'core:ElectricalPowerInW') {
            this.consumtionState.updateValue(value);
        }
    }
}

//
// Custom Service for Energy
//

function makeEnergyService() {

  EnergyService = function(displayName, subtype) {
	  Service.call(this, displayName, '0000003E-0000-1000-8000-0026BB765291', subtype);

	  // Required Characteristics
	  this.addCharacteristic(EnergyCharacteristic);
	  this.addCharacteristic(ConsumptionCharacteristic);
	};
  
  inherits(EnergyService, Service);
}

//
// Custom Characteristic for Energy (kWh)
//

function makeEnergyCharacteristic() {

  EnergyCharacteristic = function() {
    Characteristic.call(this, 'Energy', 'E863F10C-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.INT,
      unit: null,
      maxValue: null,
      minValue: 0,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  
  inherits(EnergyCharacteristic, Characteristic);
}

//
// Custom Characteristic for Consumption (W)
//

function makeConsumptionCharacteristic() {

  ConsumptionCharacteristic = function() {
    Characteristic.call(this, 'Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
    this.setProps({
      format: Characteristic.Formats.INT,
      unit: null,
      maxValue: null,
      minValue: 0,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  
  inherits(ConsumptionCharacteristic, Characteristic);
}