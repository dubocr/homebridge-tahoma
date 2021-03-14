import { Characteristics, Services } from './Platform';
import { CharacteristicValue, Logger, PlatformAccessory, Service, WithUUID } from 'homebridge';
import { Device, State, Command, Action, ExecutionState } from 'overkiz-client';
import { Platform } from './Platform';

export default class Mapper {
    protected log: Logger;
    protected services: Array<Service> = [];
    private postponeTimer;
    private debounceTimer;
    protected stateless = false;
    //protected config: Record<string, string | boolean | number> = {};
    private executionId;
    private actionPromise;

    constructor(
        protected readonly platform: Platform,
        protected readonly accessory: PlatformAccessory,
        protected readonly device: Device,
    ) {
        this.log = platform.log;
        const config = platform.config[device.oid] ||
            platform.config[device.label] ||
            platform.config[device.widget] ||
            platform.config[device.uiClass] ||
            {};
        this.applyConfig(config);

        const info = this.accessory.getService(Services.AccessoryInformation);
        if(info) {
            info.setCharacteristic(Characteristics.Manufacturer, device.manufacturer);
            info.setCharacteristic(Characteristics.Model, device.model);
            info.setCharacteristic(Characteristics.SerialNumber, device.serialNumber);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected applyConfig(config) {
        //
    }

    protected registerService(type: WithUUID<typeof Service>, subtype?: string): Service {
        let service: Service;
        const name = subtype ? this.translate(subtype) : this.device.label;
        if(subtype) {
            service = this.accessory.getServiceById(type, subtype) || this.accessory.addService(type, name, subtype);
        } else {
            service = this.accessory.getService(type) || this.accessory.addService(type);
        }
        service.setCharacteristic(Characteristics.Name, name);
        this.services.push(service);
        return service;
    }

    protected registerCharacteristic(service: Service, characteristic) {
        return service.getCharacteristic(characteristic) || service.addCharacteristic(characteristic);
    }

    private translate(value: string) {
        switch(value) {
            case 'boost': return 'Boost';
            case 'drying': return 'Séchage';
            default: return value.charAt(0).toUpperCase() + value.slice(1);
        }
    }

    protected debounce(task) {
        return (value: CharacteristicValue) => {
            if(this.debounceTimer !== null) {
                clearTimeout(this.debounceTimer);
            }
            this.debounceTimer = setTimeout(() => {
                task.bind(this)(value).catch(() => null);
                this.debounceTimer = null;
            }, 2000);
        };
    }

    protected postpone(task, ...args) {
        if(this.postponeTimer !== null) {
            clearTimeout(this.postponeTimer);
        }
        this.postponeTimer = setTimeout(task.bind(this), 500, ...args);
    }

    protected async executeCommands(commands: Command|Array<Command>|undefined): Promise<Action> {
        let commandName = '';
        if(commands === undefined || (Array.isArray(commands) && commands.length === 0)) {
            throw new Error('No target command for ' + this.device.label);
        } else if(Array.isArray(commands)) {
            if(commands.length === 0) {
                throw new Error('No target command for ' + this.device.label);
            } else if(commands.length > 1) {
                commandName = commands[0].name + ' +' + (commands.length-1) + ' others';
            } else {
                commandName = commands[0].name;
            }
            for(const c of commands) {
                this.debug(c.name + JSON.stringify(c.parameters));
            }
        } else {
            this.debug(commands.name +JSON.stringify(commands.parameters));
            commandName = commands.name;
            commands = [commands];
        }

        /*
        if (!this.isIdle) {
            this.cancelExecution();
        }
        */

        const highPriority = this.device.hasState('io:PriorityLockLevelState') ? true : false;
        const label = this.device.label + ' - ' + commandName;

        if(this.actionPromise) {
            this.actionPromise.action.addCommands(commands);
        } else {
            this.actionPromise = new Promise((resolve, reject) => {
                setTimeout(async () => {
                    try {
                        this.executionId = await this.platform.executeAction(label, this.actionPromise.action, highPriority);
                        resolve(this.actionPromise.action);
                    } catch(error) {
                        this.error(commandName + ' ' + error.message);
                        reject(error);
                    }
                    this.actionPromise = null;
                }, 100);
                
            });
            this.actionPromise.action = new Action(this.device.deviceURL, commands);
            this.actionPromise.action.on('update', (state, event) => {
                this.debug(commandName + ' ' + (state === ExecutionState.FAILED ? event.failureType : state));
            });
        }
        return this.actionPromise;
    }

    private async delay(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }
    
    /**
     * Logging methods
     */

    protected debug(message) {
        this.platform.log.debug('[' + this.device.label + '] ' + message);
    }

    protected info(message) {
        this.platform.log.info('[' + this.device.label + '] ' + message);
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

    // OLD
    get isIdle() {
        return !(this.executionId in this.platform.client.executionPool);
    }

    cancelExecution() {
        this.platform.client.cancelExecution(this.executionId);
    }
}