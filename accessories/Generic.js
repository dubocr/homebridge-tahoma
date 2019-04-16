var Accessories, Log, Service, Characteristic, Command, ExecutionState;
var builder = function(homebridge, log, api) {
    Log = log;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Command = api.Command;
	ExecutionState = api.ExecutionState;
	
	Accessories = [];
	// load up all accessories
	var accessoriesDir = __dirname;
	var scriptName = path.basename(__filename);

	fs.readdirSync(accessoriesDir).forEach(function(file) {
		if (file != scriptName && file.indexOf('.js') > 0) {
			var name = file.replace('.js', '');

			console.log("Import " + file);
			Accessories[name] = require(path.join(accessoriesDir, file));
		}
	});
}

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
    constructor(homebridge, device, config) {
    	var Service = homebridge.hap.Service;
    	var Characteristic = homebridge.hap.Characteristic;
    	var UUIDGen = homebridge.hap.uuid;
    	//Log("Building Generic for device " + device.label);
    	this.services = [];
    	
        var informationService = new Service.AccessoryInformation();

        this.displayName = device.getName();
        this.uuid_base = UUIDGen.generate(device.getSerialNumber());

        informationService.setCharacteristic(Characteristic.Manufacturer, device.getManufacturer());
        informationService.setCharacteristic(Characteristic.Model, device.getModel());
        informationService.setCharacteristic(Characteristic.SerialNumber, device.getSerialNumber());
        this.services.push(informationService);
    }

    getServices() {
        return this.services;
    }
}

module.exports = { builder, Accessories, Log, Service, Characteristic, Command, ExecutionState, Generic };