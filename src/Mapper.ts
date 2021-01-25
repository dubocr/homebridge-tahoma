import { CharacteristicSetCallback, CharacteristicValue, Logger, PlatformAccessory, Service } from 'homebridge';
import { ExecutionState } from 'overkiz-client';
import { State } from 'overkiz-client';
import { Command } from 'overkiz-client';
import { Device } from 'overkiz-client';
import { Platform } from './Platform';

export default class Mapper {
    protected log: Logger;
    protected services: Array<Service> = [];
    private debounceTimer;
    protected stateless = false;
    protected config: Record<string, unknown> = {};

    constructor(
        protected readonly platform: Platform,
        protected readonly accessory: PlatformAccessory,
        protected readonly device: Device,
    ) {
        this.log = platform.log;
        this.config = platform.config[device.oid] ||
            platform.config[device.label] ||
            platform.config[device.widget] ||
            platform.config[device.uiClass] ||
            {};

        const info = this.accessory.getService(this.platform.Service.AccessoryInformation);
        if(info) {
            info.setCharacteristic(this.platform.Characteristic.Manufacturer, device.manufacturer);
            info.setCharacteristic(this.platform.Characteristic.Model, device.model);
            info.setCharacteristic(this.platform.Characteristic.SerialNumber, device.serialNumber);
        }
        this.stateless = (device.states.length === 0);

        //this.buildService
        this.buildServices();

        if(!this.stateless) {
            // Init states
            this.onStatesChange(this.device.states);

            // Register state changes
            device.on('states', (states) => {
                this.onStatesChange(states);
            });
        }
    }

    protected registerService(serviceName) {
        const service: Service = this.accessory.getService(serviceName) || this.accessory.addService(serviceName);
        service.setCharacteristic(this.platform.Characteristic.Name, this.device.label);
        this.services.push(service);
        return service;
    }

    protected debounce(task) {
        return (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
            if(this.debounceTimer !== null) {
                clearTimeout(this.debounceTimer);
            }
            this.debounceTimer = setTimeout(task.bind(this), 2000, value, (err) => err);
            callback();
        };
    }

    protected executeCommands(commands: Command|Array<Command>) {
        let title = '';
        if(commands === null || (Array.isArray(commands) && commands.length === 0)) {
            throw new Error('No target command for ' + this.device.label);
        } else if(Array.isArray(commands)) {
            if(commands.length === 0) {
                throw new Error('No target command for ' + this.device.label);
            } else if(commands.length > 1) {
                title = commands[0].name + ' +' + (commands.length-1) + ' others';
            } else {
                title = commands[0].name;
            }
            for(const c of commands) {
                this.debug(c.name + JSON.stringify(c.parameters));
            }
        } else {
            this.debug(commands.name +JSON.stringify(commands.parameters));
            title = commands.name;
            commands = [commands];
        }
        
        return this.device.executeCommands(title + ' - HomeKit', commands)
            .then((action) => {
                action.on('state', (state, event) => {
                    this.debug(title + ' ' + (state === ExecutionState.FAILED ? event.failureType : state));
                });
                return action;
            })
            .catch((error) => {
                this.debug(title + ' ' + error.message);
                throw error;
            });
    }

    protected buildServices() {
        // 
    }

    protected onStatesChange(states: Array<State>) {
        states.forEach((state: State) => this.onStateChange(state.name, state.value));
    }

    protected onStateChange(name: string, value: unknown) {
        this.debug(name + ' => ' + value);
    }
    
    /**
     * Logging methods
     */
    protected debug(message) {
        this.platform.log.debug('[' + this.device.label + '] ' + message);
    }

    protected warn(message) {
        this.platform.log.warn('[' + this.device.label + '] ' + message);
    }

    protected error(message) {
        this.platform.log.error('[' + this.device.label + '] ' + message);
    }
}