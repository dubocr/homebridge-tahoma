
module.exports = function(homebridge, log, api) {
    Generic = require('Generic')(homebridge, log, api);
    Characteristic = homebridge.hap.Characteristic;
    return Window;
}

class Window extends Generic {
    constructor (device, config) {
        super(device, config);
        var def = config['defaultPosition'] !== undefined ? config['defaultPosition'] : 50;
        this.reverse = config['reverse'] || false;
        this.blindMode = config['blindMode'] || false;
        this.blindMode = this.blindMode && device.uiClass.endsWith('Blind');

        this.service = device.uiClass == 'Window' ? new Service.Window(device.getName()) : new Service.WindowCovering(device.getName());

        this.currentPosition = this.service.getCharacteristic(Characteristic.CurrentPosition);
        this.targetPosition = this.service.getCharacteristic(Characteristic.TargetPosition);
        if(device.widget.startsWith('UpDownHorizontal')) {
            this.targetPosition.on('set', this.deployUndeployCommand.bind(this));
            this.currentPosition.updateValue(def);
            this.targetPosition.updateValue(def);
        } else if(device.widget.startsWith('PositionableHorizontal') || device.widget == 'PositionableScreen') { // PositionableHorizontal, PositionableScreen
            this.targetPosition.on('set', this.postpone.bind(this, this.setDeployment.bind(this)));
            this.obstruction = this.service.addCharacteristic(Characteristic.ObstructionDetected);
        } else if(device.widget.startsWith('UpDown') || device.widget.startsWith('RTS')) {
            this.targetPosition.on('set', this.upDownCommand.bind(this));
            this.currentPosition.updateValue(def);
            this.targetPosition.updateValue(def);
        } else {
            if(this.blindMode) {
                this.log("Blind mode enabled for " + this.name);
                this.targetPosition.on('set', this.postpone.bind(this, this.setBlindPosition.bind(this)));
            } else {
                this.targetPosition.on('set', this.postpone.bind(this, this.setClosure.bind(this)));
            }
            this.obstruction = this.service.addCharacteristic(Characteristic.ObstructionDetected);
        }
        this.positionState = this.service.getCharacteristic(Characteristic.PositionState);
        this.positionState.updateValue(Characteristic.PositionState.STOPPED);

        for(command of device.definition.commands) {
            if(command.commandName == 'setOrientation')	{
                this.currentAngle = this.service.addCharacteristic(Characteristic.CurrentHorizontalTiltAngle);
                this.targetAngle = this.service.addCharacteristic(Characteristic.TargetHorizontalTiltAngle);
                this.targetAngle.on('set', this.setAngle.bind(this));
                break;
            }
        }

        this.services.push(this.service);
    }
}    