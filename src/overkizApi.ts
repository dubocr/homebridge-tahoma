import axios from 'axios';
import events from 'events';
import pollingtoevent from 'polling-to-event';
import { URLSearchParams } from 'url';
import OverkizDevice from './api/OverkizDevice';

let Log;

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

export class Action {
    deviceURL;
    commands: Command[] = [];

    constructor(deviceURL: string, commands: []) {
        this.deviceURL = deviceURL;
        this.commands = commands;
    }
}

export class Execution {
    label;
    metadata = null;
    actions: Action[] = [];

    constructor(name, deviceURL?: string, commands?: []) {
        this.label = name;
        if(deviceURL && commands) {
            this.actions.push(new Action(deviceURL, commands));
        }
    }
}

class Queue {
    commands: any[] = [];

    constructor(command: Command) {
        this.commands = [command];
    }

    callback(status, error, data) {
        if(error && data && data.failedCommands) {
            for(const command of this.commands) {
                let failed = false;
                for(const fail of data.failedCommands) {
                    if(fail.deviceURL === command.deviceURL) {
                        command.callback(status, fail.failureType, data);
                        failed = true;
                        break;
                    }
                }
                if(!failed) {
                    command.callback(ExecutionState.COMPLETED, null, data);
                }
            }
        } else {
            for(const command of this.commands) {
                command.callback(status, error, data);
            }
        }
    }

    getExecution() {
        const label = this.commands.length > 1 ? 'Execute scene (' + this.commands.length + ' devices) - HomeKit' : this.commands[0].label;
        const execution = new Execution(label);
        for(const command of this.commands) {
            execution.actions.push(new Action(command.deviceURL, command.commands));
        }
        return execution;
    }

    push(command) {
        this.commands.push(command);
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

export default class OverkizClient {

    events;

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
    runningCommands = 0;
    executionCallback: ((state, error, data) => void)[] = [];
    platformAccessories = [];
    stateChangedEventListener = null;
    pendingQueue: null|Queue = null;
    cookies = '';

    constructor(log, config) {
        Log = log;

        this.events = new events.EventEmitter();

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
        this.runningCommands = 0;
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
                    this.events.emit('states', event.deviceURL, event.deviceStates);
                    if(this.debug) {
                        for(const state of event.deviceStates) {
                            Log(state.name + ' -> ' + state.value);
                        }
                    }
                } else if (event.name === 'ExecutionStateChangedEvent') {
                    //Log(event.failedCommands);
                    const cb = this.executionCallback[event.execId];
                    if (cb !== null) {
                        cb(event.newState, event.failureType === undefined ? null : event.failureType, event);
                        if (event.timeToNextState === -1) { // No more state expected for this execution
                            delete this.executionCallback[event.execId];
                            if(this.hasExecution()) {
                                this.runningCommands--;
                            } else {
                                this.runningCommands = 0;
                            }
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
                                    this.events.emit('states', device.deviceURL, device.deviceStates);
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
        return Object.keys(this.executionCallback).length > 0;
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
        const devices = await this.get('/setup/devices');
        return devices.map((device) => new OverkizDevice(device));
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
    	command: The command to execute
    */
    executeCommand(command) {
        if(command.highPriority) {
            this.execute('apply/highPriority', new Execution(command.label, command.deviceURL, command.commands), command.callback);
        } else {
            if(this.pendingQueue === null) {
                this.pendingQueue = new Queue(command);
                setTimeout(() => {
                    if(this.pendingQueue !== null) {
                        const queue = this.pendingQueue;
                        this.pendingQueue = null;
                        this.execute('apply', queue.getExecution(), queue.callback.bind(queue));
                    }
                }, 100);
            } else {
                this.pendingQueue.push(command);
            }
        }
    }

    /*
    	oid: The command OID or 'apply' if immediate execution
    	execution: Body parameters
    	callback: Callback function executed when command sended
    */
    execute(oid, execution, callback) {
        if(this.runningCommands >= 10) {
        // Avoid EXEC_QUEUE_FULL (max 10 commands simultaneous)
            setTimeout(this.execute.bind(this), 10 * 1000, oid, execution, callback); // Postpone in 10 sec
            return;
        }
        //Log(command);
        this.runningCommands++;
        return this.post('/exec/'+oid, execution)
            .then((data) => {
                callback(ExecutionState.INITIALIZED, null, data); // Init OK
                this.executionCallback[data.execId] = callback;
                if(this.pollingPeriod === 0) {
                    this.registerListener();
                }
            })
            .catch((error) => {
                this.runningCommands--;
                callback(ExecutionState.FAILED, error);
            });
    }
}
