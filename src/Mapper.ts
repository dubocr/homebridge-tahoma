import { CharacteristicSetCallback, CharacteristicValue, Logger, PlatformAccessory, Service } from 'homebridge';
import { Action, ExecutionState } from 'overkiz-client';
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
            this.services.push(info);
        }
        this.stateless = (device.states.length === 0);

        this.registerServices();
        this.accessory.services.forEach((service) => {
            if(!this.services.find((s) => s.UUID === service.UUID)) {
                this.accessory.removeService(service);
            }
        });

        if(!this.stateless) {
            // Init and register states changes
            this.propagateStates(this.device.states);
            device.on('states', this.propagateStates.bind(this));

            // Init and register sensors states changes
            this.device.sensors.forEach((sensor) => {
                this.propagateStates(sensor.states);
                sensor.on('states', this.propagateStates.bind(this));
            });
        }
    }

    private propagateStates(states) {
        this.onStatesUpdate();
        states.forEach((state: State) => this.onStateChange(state.name, state.value));
    }

    protected registerServices() {
        // 
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

    protected executeCommands(
        commands: Command|Array<Command>,
        callback: CharacteristicSetCallback | undefined = undefined,
    ): Promise<Action> {
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
                action.on('update', (state, event) => {
                    this.debug(title + ' ' + (state === ExecutionState.FAILED ? event.failureType : state));
                });
                if(callback) {
                    callback();
                }
                return action;
            })
            .catch((error) => {
                this.debug(title + ' ' + error.message);
                if(callback) {
                    callback(error);
                }
                throw error;
            });
    }

    protected onStatesUpdate() {
        //
    }

    protected onStateChange(name: string, value) {
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