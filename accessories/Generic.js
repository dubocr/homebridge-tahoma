var Log, Service, Characteristic, Accessory, UUIDGen;

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

class Generic {
    constructor(homebridge, log, device, config) {
    	Log = log;
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;
		Accessory = homebridge.platformAccessory;
		UUIDGen = homebridge.hap.uuid;
		
		this.device = device;
    	
    	this.hapAccessory = {};
    	this.hapAccessory.name = device.name;
    	this.hapAccessory.displayName = device.name;
    	this.hapAccessory.uuid_base = UUIDGen.generate(device.getSerialNumber());
    	this.hapAccessory.services = [];
    	this.hapAccessory.getServices = function() {
    		return this.services;
    	};
    	//inherits(HAPAccessory, Accessory);
    	
        var informationService = new Service.AccessoryInformation();

        informationService.setCharacteristic(Characteristic.Manufacturer, device.getManufacturer());
        informationService.setCharacteristic(Characteristic.Model, device.getModel());
        informationService.setCharacteristic(Characteristic.SerialNumber, device.getSerialNumber());
        this.addService(informationService);
    }

    addService(service) {
        this.hapAccessory.services.push(service);
    }
    
    getServices() {
        return this.hapAccessory.services;
    }
    
    isCommandInProgress() {
    	return this.device.isCommandInProgress();
    }
    
    executeCommand(commands, callback) {
    	return this.device.executeCommand(commands, callback);
    }
}

module.exports = Generic;