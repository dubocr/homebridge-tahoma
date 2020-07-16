import axios from 'axios';
import { default as events, EventEmitter } from 'events';
import pollingtoevent from 'polling-to-event';
import { URLSearchParams } from 'url';
import OverkizDevice from './models/OverkizDevice';

let Log;

export class ExecutionError extends Error {
    public readonly state;
    constructor(state, error) {
        super(error);
        this.state = state;
    }
}

export interface DeviceState {
    readonly name;
    readonly type;
    readonly value;
}

export interface ExecutionStateEvent {
    readonly timestamp: number;
    readonly setupOID;
    readonly execId;
    readonly newState: ExecutionState;
    readonly ownerKey;
    readonly type: number;
    readonly subType: number;
    readonly oldState: ExecutionState;
    readonly timeToNextState: number;
    readonly name;
}

export class Command {
    type = 1;
    name = '';
    parameters: unknown[] = [];

    constructor(name, parameters) {
        this.name = name;
        if (typeof(parameters)==='undefined') {
            parameters = [];
        }
        if (!Array.isArray(parameters)) {
            parameters = [parameters];
        }
        this.parameters = parameters;
    }
}

export class Action extends EventEmitter {
    public deviceURL;
    public commands: Command[] = [];

    constructor(public readonly label: string, public highPriority: boolean) {
        super();
    }

    toJSON() {
        return {
            deviceURL: this.deviceURL,
            commands: this.commands,
        };
    }
}

export class Execution {
    private timeout;

    public label = '';
    public actions: Action[] = [];
    public metadata = null;

    addAction(action: Action) {
        this.label = this.actions.length === 0 ? action.label : 'Execute scene (' + this.actions.length + ' devices) - HomeKit';
        this.actions.push(action);
    }

    onStateUpdate(state, event) {
        if(event.failureType && event.failedCommands) {
            this.actions.forEach((action) => {
                const failure = event.failedCommands.find((c) => c.deviceURL === action.deviceURL);
                if(failure) {
                    action.emit('state', ExecutionState.FAILED, failure);
                } else {
                    action.emit('state', ExecutionState.COMPLETED);
                }
            });
        } else {
            this.actions.forEach((action) => action.emit('state', state, event));
        }
    }

    hasPriority() {
        return this.actions.find((action) => action.highPriority) ? true : false;
    }
}

export enum ExecutionState {
    INITIALIZED = 'INITIALIZED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

enum Server {
	'Cozytouch' = 'ha110-1.overkiz.com',
	'TaHoma' = 'tahomalink.com',
	'Connexoon' = 'tahomalink.com',
	'Connexoon RTS' = 'ha201-1.overkiz.com',
	'Rexel' = 'ha112-1.overkiz.com'
}

export default class OverkizClient extends events.EventEmitter {
    debug: boolean;
    debugUrl: string;
    execPollingPeriod;
    pollingPeriod;
    refreshPeriod;
    service;
    user;
    password;
    server;
    isLoggedIn = false;
    listenerId: null|number = null;
    executionPool: Execution[] = [];
    platformAccessories = [];
    stateChangedEventListener = null;
    execution: Execution = new Execution();
    cookies = '';

    executionTimeout;

    constructor(log, config) {
        super();
        Log = log;

        // Default values
        this.debug = config['debug'] || false;
        this.debugUrl = config['debugUrl'] || false;
        this.execPollingPeriod = config['execPollingPeriod'] || 2; // Poll for execution events every 2 seconds by default
        this.pollingPeriod = config['pollingPeriod'] || 0; // Don't continuously poll for events by default
        this.refreshPeriod = config['refreshPeriod'] || (60 * 30); // Refresh device states every 30 minutes by default
        this.service = config['service'] || 'TaHoma';

        this.user = config['user'];
        this.password = config['password'];
        this.server = Server[this.service];

        if (!this.user || !this.password) {
            throw new Error('You must provide credentials (\'user\'/\'password\')');
        }
        if (!this.server) {
            throw new Error('Invalid service name \''+this.service+'\'');
        }

        this.isLoggedIn = false;
        this.listenerId = null;
        this.platformAccessories = [];

        axios.defaults.baseURL = this.debugUrl ? this.debugUrl : 'https://' + this.server + '/enduser-mobile-web/enduserAPI';
        axios.defaults.withCredentials = true;

        const pollCallback = (done) => {
            if(this.debug) {
                //Log('Polling ('+this.isLoggedIn+'/'+this.listenerId+')');
            }
            if (this.isLoggedIn && this.listenerId !== null && this.listenerId !== 0) {
                this.post('/events/' + this.listenerId + '/fetch')
                    .then((data) => {
                        done(null, data);
                    }).catch((error) => {
                        done(error, null);
                    });
            } else {
                if(this.pollingPeriod > 0 && this.debug) {
                    Log('No listener registered while in always poll mode');
                }
                done(null, []);
            }
        };

        const longPollCallback = (data) => {
            for (const event of data) {
                //Log(event);
                if (event.name === 'DeviceStateChangedEvent') {
                    this.emit('states', event.deviceURL, event.deviceStates);
                    if(this.debug) {
                        for(const state of event.deviceStates) {
                            Log(state.name + ' -> ' + state.value);
                        }
                    }
                } else if (event.name === 'ExecutionStateChangedEvent') {
                    //Log(event);
                    const execution = this.executionPool[event.execId];
                    if (execution) {
                        execution.onStateUpdate(event.newState, event);
                        //cb(event.newState, event.failureType === undefined ? null : event.failureType, event);
                        if (event.timeToNextState === -1) { // No more state expected for this execution
                            delete this.executionPool[event.execId];
                            if(this.pollingPeriod === 0 && !this.hasExecution()) { // Unregister listener when no more execution running
                                this.unregisterListener();
                            }
                        }
                    }
                }
            }
        };

        const execpoll = pollingtoevent((done) => {
            if(this.hasExecution()) {
                pollCallback(done);
            }
        }, {
            longpolling: true,
            interval: (1000 * this.execPollingPeriod),
        });
        execpoll.on('longpoll', longPollCallback);

        execpoll.on('error', (error) => {
            Log('[EXECPOLLING] Error with listener ' + this.listenerId + ' => ' + error);
            this.listenerId = null;
            this.registerListener();
        });

        if(this.pollingPeriod > 0) {
            const eventpoll = pollingtoevent((done) => {
                if(!this.hasExecution()) {
                    pollCallback(done);
                }
            }, {
                longpolling: true,
                interval: (1000 * this.pollingPeriod),
            });
            eventpoll.on('longpoll', longPollCallback);
            eventpoll.on('error', (error) => {
                Log('[POLLING] Error with listener ' + this.listenerId + ' => ' + error);
                this.listenerId = null;
                this.registerListener();
            });
        }

        const refreshpoll = pollingtoevent(async (done) => {
            if(this.debug) {
                Log('Refresh ALL ('+this.isLoggedIn+')');
            }
            if(this.isLoggedIn) {
                try {
                    const data = await this.refreshStates();
                    setTimeout(() => {
                        this.getDevices()
                            .then((data) => {
                                for (const device of data) {
                                    this.emit('states', device.deviceURL, device.deviceStates);
                                }
                            });
                    }, 10 * 1000); // Read devices states after 10s
                    done(null, data);
                } catch(error) {
                    done(error, null);
                }
            } else {
                Log('Unable to refresh states (not logged in)');
            }
        }, {
            longpolling: true,
            interval: (1000 * this.refreshPeriod),
        });

        refreshpoll.on('error', (error) => {
            Log('Error: ' + error);
        });
    }

    hasExecution() {
        return Object.keys(this.executionPool).length > 0;
    }

    makeRequest(options) {
        let request;
        if(this.isLoggedIn) {
            request = axios(options);
        } else {
            this.listenerId = null;
            Log('Login ' + this.service + ' server...');
            const params = new URLSearchParams();
            params.append('userId', this.user);
            params.append('userPassword', this.password);
            request = axios.post('/login', params)
                .then((response) => {
                    this.isLoggedIn = true;
                    const cookie = response.headers['set-cookie']
                        .map((c) => c.split(';'))
                        .reduce((cookies, cookie) => cookies.concat(cookie))
                        .filter((cookie) => cookie.startsWith('JSESSIONID'));
                    axios.defaults.headers.common['Cookie'] = cookie + ';';
                    if(this.pollingPeriod > 0) {
                        this.registerListener();
                    }
                    return axios(options);
                });
        }

        return request.then((response) => response.data).catch((error) => {
            if(error.response) {
                if (error.response.status === 401) { // Reauthenticated
                    if(this.isLoggedIn) {
                        this.isLoggedIn = false;
                        return this.makeRequest(options);
                    } else {
                        Log.warn('Login failure');
                        throw error.response.data.error;
                    }
                } else {
                    let msg = 'Error ' + error.response.statusCode;
                    const json = JSON.parse(error.response.data);
                    if(json && json.error !== null) {
                        msg += ' ' + json.error;
                    }
                    if(json && json.errorCode !== null) {
                        msg += ' (' + json.errorCode + ')';
                    }
                    Log(msg);
                    throw msg;
                }
            } else if (error.request) {
                Log('Error: ' + error.request);
                throw error;
            } else {
                Log('Error: ' + error.message);
                throw error;
            }
        });
    }

    post(url: string, data?: Record<string, unknown>) {
        return this.makeRequest({
            method: 'post',
            url: url,
            data: data,
        });
    }

    get(url: string) {
        return this.makeRequest({
            method: 'get',
            url: url,
        });
    }

    put(url: string, data?: Record<string, unknown>) {
        return this.makeRequest({
            method: 'put',
            url: url,
            data: data,
        });
    }

    delete(url: string) {
        return this.makeRequest({
            method: 'delete',
            url: url,
        });
    }

    getDevices() {
        return this.get('/setup/devices');
    }

    async getDeviceModels() {
        const devices: OverkizDevice[] = [];
        const data = await this.get('/setup/devices');
        for(const d of data) {
            const device = await import('./models/widget/' + d.widget)
                .then((c) => new c.default(this, d))
                .catch(() => new OverkizDevice(this, d));
            if(device.isMainDevice()) {
                devices.push(device);
            } else {
                const main = devices.filter((d) => d.getBaseURL() === device.getBaseURL()).pop();
                if(main) {
                    main.addChild(device);
                } else {
                    Log.debug('No main device to attach ' + device.label);
                }
            }
        }
        return devices;
    }



    getActionGroups() {
        return this.get('/actionGroups');
    }



    registerListener() {
        if(this.listenerId === null) {
            this.listenerId = 0;
            Log('Try to register listener...');
            this.post('/events/register')
                .then((data) => {
                    this.listenerId = data.id;
                    Log('Listener registered ' + this.listenerId);
                })
                .catch(() => {
                    this.listenerId = null;
                    Log('Error while registering listener');
                    setTimeout(this.registerListener.bind(this), 1000 * 30);
                });
        }
    }

    unregisterListener() {
        if(this.listenerId !== null) {
            Log.debug('Unregister listener');
            this.post('/events/' + this.listenerId + '/unregister')
                .then(() => {
                    this.listenerId = null;
                });
        }
    }

    refreshStates() {
        return this.put('/setup/devices/states/refresh');
    }

    requestState(deviceURL, state) {
        return this.get('/setup/devices/' + encodeURIComponent(deviceURL) + '/states/' + encodeURIComponent(state))
            .then((data) => data.value);
    }

    cancelCommand(execId) {
        return this.delete('/exec/current/setup/' + execId);
    }

    /*
    	action: The action to execute
    */
    public executeAction(action) {
        this.execution.addAction(action);
        clearTimeout(this.executionTimeout);
        return new Promise((resolve, reject) => {
            this.executionTimeout = setTimeout(() => {
                this.execute(this.execution.hasPriority() ? 'apply/highPriority' : 'apply', this.execution).then(resolve).catch(reject);
                this.execution = new Execution();
            }, 100);
        });
    }

    /*
    	oid: The command OID or 'apply' if immediate execution
    	execution: Body parameters
    	callback: Callback function executed when command sended
    */
    execute(oid, execution) {
        if(this.executionPool.length >= 10) {
            // Avoid EXEC_QUEUE_FULL (max 10 commands simultaneous)
            setTimeout(this.execute.bind(this), 10 * 1000, oid, execution); // Postpone in 10 sec
            return;
        }
        //Log(JSON.stringify(execution));
        return this.post('/exec/'+oid, execution)
            .then((data) => {
                this.executionPool[data.execId] = execution;
                if(this.pollingPeriod === 0) {
                    this.registerListener();
                }
                return execution;
            })
            .catch((error) => {
                throw new ExecutionError(ExecutionState.FAILED, error);
            });
    }
}
