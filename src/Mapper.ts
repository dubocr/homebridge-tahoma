import { Characteristics, Services } from './Platform';
import { CharacteristicValue, Logger, PlatformAccessory, Service, WithUUID } from 'homebridge';
import { Device, State, Command, Action, ExecutionState } from 'overkiz-client';
import { Platform } from './Platform';
import { GREY } from './colors';

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
        this.log = this.platform.log;
    }

    public build() {
        const config = Object.assign({},
            this.platform.devicesConfig[this.device.uiClass],
            this.platform.devicesConfig[this.device.widget],
            this.platform.devicesConfig[this.device.label],
            this.platform.devicesConfig[this.device.oid],
        );
        this.applyConfig(config);
        if (Object.keys(config).length > 0) {
            delete config.key;
            if (this.platform.config.debug) {
                this.log.info(`${GREY}  Config: `, JSON.stringify(config));
            } else {
                this.log.debug('  Config: ', JSON.stringify(config));
            }
        }

        const info = this.accessory.getService(Services.AccessoryInformation);
        if (info) {
            info.setCharacteristic(Characteristics.Manufacturer, this.device.manufacturer);
            info.setCharacteristic(Characteristics.Model, this.device.model);
            info.setCharacteristic(Characteristics.SerialNumber, this.device.address.substring(0, 64));
            this.services.push(info);
        }
        this.stateless = (this.device.states.length === 0);

        this.registerServices();
        this.accessory.services.forEach((service) => {
            if (!this.services.find((s) => s.UUID === service.UUID && s.subtype === service.subtype)) {
                this.accessory.removeService(service);
            }
        });

        if (!this.stateless) {
            // Init and register states changes
            this.onStatesChanged(this.device.states, true);
            this.device.on('states', states => this.onStatesChanged(states));

            // Init and register sensors states changes
            this.device.sensors.forEach((sensor) => {
                this.onStatesChanged(sensor.states, true);
                sensor.on('states', states => this.onStatesChanged(states));
            });
        }

        // TODO: instanciate mapper for device sensors
        // Configure accessory sensors
        // this.device.sensors.forEach((sensor) => new mapper(platform, accessory, sensor)))
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
        if (subtype) {
            service = this.accessory.getServiceById(type, subtype) || this.accessory.addService(type, name, subtype);
        } else {
            service = this.accessory.getService(type) || this.accessory.addService(type);
        }
        service.setCharacteristic(Characteristics.Name, name);
        /*
        service.getCharacteristic(Characteristics.Name)
            .updateValue(name)
            .onSet((value) => {
                this.debug('Will rename ' + name + ' to ' + value);
                this.platform.client.setDeviceName(this.device.deviceURL, value);
            });
        */
        this.services.push(service);
        return service;
    }

    private translate(value: string) {
        switch (value) {
            case 'boost': return 'Boost';
            case 'drying': return 'Séchage';
            default: return value.charAt(0).toUpperCase() + value.slice(1);
        }
    }

    protected debounce(task) {
        return (value: CharacteristicValue) => {
            if (this.debounceTimer !== null) {
                clearTimeout(this.debounceTimer);
            }
            this.debounceTimer = setTimeout(() => {
                this.debounceTimer = null;
                task.bind(this)(value).catch(() => null);
            }, 2000);
        };
    }

    protected postpone(task, ...args) {
        if (this.postponeTimer !== null) {
            clearTimeout(this.postponeTimer);
        }
        this.postponeTimer = setTimeout(task.bind(this), 500, ...args);
    }

    protected async executeCommands(commands: Command | Array<Command> | undefined, standalone = false): Promise<Action> {
        if (commands === undefined || (Array.isArray(commands) && commands.length === 0)) {
            this.error('No target command for', this.device.label);
            throw new Error('No target command for ' + this.device.label);
        } else if (Array.isArray(commands)) {
            for (const c of commands) {
                this.info(c.name + JSON.stringify(c.parameters));
            }
        } else {
            this.info(commands.name + JSON.stringify(commands.parameters));
            commands = [commands];
        }

        const commandName = commands[0].name;
        const localizedName = this.platform.translate(
            commands[0].name + (commands[0].parameters.length > 0 ? '.' + commands[0].parameters[0] : ''),
        );
        /*
        if (!this.isIdle) {
            this.cancelExecution();
        }
        */

        const highPriority = this.device.hasState('io:PriorityLockLevelState') ? true : false;
        const label = this.device.label + ' - ' + localizedName;

        if (this.actionPromise) {
            this.actionPromise.action.addCommands(commands);
        } else {
            this.actionPromise = new Promise((resolve, reject) => {
                setTimeout(async () => {
                    try {
                        this.executionId = await this.platform.executeAction(label, this.actionPromise.action, highPriority, standalone);
                        resolve(this.actionPromise.action);
                    } catch (error: any) {
                        this.error(commandName + ' ' + error.message);
                        reject(error);
                    }
                    this.actionPromise = null;
                }, 100);

            });
            this.actionPromise.action = new Action(this.device.deviceURL, commands);
            this.actionPromise.action.on('update', (state, event) => {
                if (state === ExecutionState.FAILED) {
                    this.error(commandName, event.failureType);
                } else if (state === ExecutionState.COMPLETED) {
                    this.info(commandName, state);
                } else {
                    this.debug(commandName, state);
                }
            });
        }
        return this.actionPromise;
    }

    private async delay(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    protected async requestStatesUpdate(defer?: number) {
        if (defer) {
            setTimeout(this.requestStatesUpdate.bind(this), defer * 1000);
        } else {
            await this.platform.client.refreshDeviceStates(this.device.deviceURL);
        }
    }

    /**
     * Logging methods
     */

    protected debug(...args) {
        if (this.platform.config.debug) {
            this.platform.log.info(`${GREY}[${this.device.label}]`, ...args);
        } else {
            this.platform.log.debug(`[${this.device.label}]`, ...args);
        }
    }

    protected info(...args) {
        this.platform.log.info(`[${this.device.label}]`, ...args);
    }

    protected warn(...args) {
        this.platform.log.warn(`[${this.device.label}]`, ...args);
    }

    protected error(...args) {
        this.platform.log.error(`[${this.device.label}]`, ...args);
    }

    /**
     * Children methods
     */

    protected registerServices() {
        // 
    }

    protected onStatesChanged(states: Array<State>, init = false) {
        states.forEach((state: State) => {
            if (!init) {
                this.debug(state.name + ' => ' + state.value);
            }
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
        return !this.platform.client.hasExecution(this.executionId);
    }

    async cancelExecution() {
        await this.platform.client.cancelExecution(this.executionId);
    }
}