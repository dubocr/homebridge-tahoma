import { CharacteristicSetCallback, CharacteristicValue, Logger, PlatformAccessory, Service, WithUUID } from 'homebridge';
import { Action, ExecutionState } from 'overkiz-client';
import { State } from 'overkiz-client';
import { Command } from 'overkiz-client';
import { Device } from 'overkiz-client';
import { Platform } from './Platform';

export default class Mapper {
    protected log: Logger;
    protected services: Array<Service> = [];
    private postponeTimer;
    private debounceTimer;
    protected stateless = false;
    protected config: Record<string, string | boolean | number> = {};

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
            if(!this.services.find((s) => s.UUID === service.UUID && s.subtype === service.subtype)) {
                this.accessory.removeService(service);
            }
        });

        if(!this.stateless) {
            // Init and register states changes
            this.onStatesChanged(this.device.states);
            device.on('states', states => this.onStatesChanged(states));

            // Init and register sensors states changes
            this.device.sensors.forEach((sensor) => {
                this.onStatesChanged(sensor.states);
                sensor.on('states', states => this.onStatesChanged(states));
            });
        }
    }

    /**
     * Helper methods
     */

    protected registerService(type: WithUUID<typeof Service>, subtype?: string) {
        let service: Service;
        const name = subtype ? this.translate(subtype) : this.device.label;
        if(subtype) {
            service = this.accessory.getServiceById(type, subtype) || this.accessory.addService(type, name, subtype);
        } else {
            service = this.accessory.getService(type) || this.accessory.addService(type);
        }
        service.setCharacteristic(this.platform.Characteristic.Name, name);
        this.services.push(service);
        return service;
    }

    private translate(value: string) {
        switch(value) {
            case 'boost': return 'Boost';
            case 'drying': return 'Séchage';
            default: return value.charAt(0).toUpperCase() + value.slice(1);
        }
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

    protected postpone(task, ...args) {
        if(this.postponeTimer !== null) {
            clearTimeout(this.postponeTimer);
        }
        this.postponeTimer = setTimeout(task.bind(this), 500, ...args);
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

    /**
     * Children methods
     */

    protected registerServices() {
        // 
    }

    protected onStatesChanged(states: Array<State>) {
        states.forEach((state: State) => {
            this.debug(state.name + ' => ' + state.value);
            this.onStateChanged(state.name, state.value);
        });
    }

    /**
     * Triggered when device state change
     * @param name State name
     * @param value State value
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onStateChanged(name: string, value) {
        //
    }
}