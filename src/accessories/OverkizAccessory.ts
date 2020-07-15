import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { OverkizPlatform } from '../platform';
import OverkizDevice from '../api/models/OverkizDevice';
import { ExecutionState } from '../api/OverkizClient';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export default class OverkizAccessory {
    protected readonly services: Service[] = [];
    private postponeTimer;
    protected stateless = false;
    
    constructor(
        protected readonly platform: OverkizPlatform,
        protected readonly device: OverkizDevice,
        protected readonly accessory: PlatformAccessory,
    ) {
        const info = this.accessory.getService(this.platform.Service.AccessoryInformation);
        if(info) {
            info.setCharacteristic(this.platform.Characteristic.Manufacturer, device.getManufacturer());
            info.setCharacteristic(this.platform.Characteristic.Model, device.getModel());
            info.setCharacteristic(this.platform.Characteristic.SerialNumber, device.getSerialNumber());
        }
        this.stateless = (device.states.length === 0);
        this.build();
    }

    debug(message) {
        this.platform.log.debug('[' + this.device.label + '] ' + message);
    }

    warn(message) {
        this.platform.log.warn('[' + this.device.label + '] ' + message);
    }

    build() {
        this.warn('Unsuported device accessory ' + this.device.uiClass);
    }

    registerService(service) {
        const srv = this.accessory.getService(service) || this.accessory.addService(service);
        srv.setCharacteristic(this.platform.Characteristic.Name, this.device.label);
        this.services.push(srv);
        return srv;
    }

    postpone(task) {
        return (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
            if(this.postponeTimer !== null) {
                clearTimeout(this.postponeTimer);
            }
            this.postponeTimer = setTimeout(task.bind(this), 2000, value, (err) => err);
            callback();
        };
    }

    executeCommand(commands) {
        let cmdName = '';
        if(commands === null || commands.length === 0) {
            throw new Error('No target command for ' + this.device.label);
        } else if(Array.isArray(commands)) {
            if(commands.length === 0) {
                throw new Error('No target command for ' + this.device.label);
            } else if(commands.length > 1) {
                cmdName = commands[0].name + ' +' + (commands.length-1) + ' others';
            } else {
                cmdName = commands[0].name;
            }
            for(const c of commands) {
                this.debug(c.name + JSON.stringify(c.parameters));
            }
        } else {
            this.debug(commands.name +JSON.stringify(commands.parameters));
            cmdName = commands.name;
            commands = [commands];
        }
        
        const commandLabel = this.device.label + ' - ' + cmdName + ' - HomeKit';
        return this.device.executeCommand(commandLabel, commands)
            .then((execution) => {
                execution.on('state', (state, event) => {
                    this.debug(cmdName + ' ' + (state === ExecutionState.FAILED ? event.failureType : state));
                });
            })
            .catch((error) => {
                this.debug(cmdName + ' ' + error.message);
                throw error;
            });
    }
}