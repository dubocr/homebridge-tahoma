var Service, Characteristic;

var path = require('path');
var fs = require('fs');

module.exports = function(homebridge, log) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.platformAccessory;
    UUIDGen = homebridge.hap.uuid;
	
    // load up all accessories
    var accessoriesDir = __dirname;
    var scriptName = path.basename(__filename);

    fs.readdirSync(accessoriesDir).forEach(function(file) {
        if (file != scriptName && file.indexOf('.js') > 0) {
            var name = file.replace('.js', '');

            Generic[name] = require(path.join(accessoriesDir, file))(homebridge, log);
            inherits(Generic[name], Generic);
        }
    });

    return Generic;
}

class Generic extends Accessory {
    constructor(device, config) {
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
