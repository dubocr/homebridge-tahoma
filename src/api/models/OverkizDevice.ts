import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import { default as OverkizClient, Action } from '../OverkizClient';
import { EventEmitter } from 'events';

export default class OverkizDevice extends EventEmitter {
    
    public oid;
    public deviceURL;
    public label;
    public uiClass;
    public widget;
    public states;
    public definition = { commands: [] };

    private child: OverkizDevice[] = [];
    private executionId = 0;

    constructor(protected readonly api: OverkizClient, json) {
        super();
        this.oid = json.oid;
        this.deviceURL = json.deviceURL;
        this.label = json.label;
        this.uiClass = json.uiClass;
        this.widget = json.widget;
        this.states = json.states;
        this.definition.commands = json.definition.commands;

        api.on('states', (deviceURL, states) => {
            if(this.deviceURL === deviceURL) {
                this.emit('states', states);
            }
        });
    }

    getSerialNumber() {
        return this.deviceURL;
    }

    isMainDevice() {
        return this.getComponentID() === 1;
    }

    getComponentID() {
        const pos = this.deviceURL.indexOf('#');
        if(pos === -1) {
            return 1;
        } else {
            return parseInt(this.deviceURL.substring(pos+1));
        }
    }

    getBaseURL() {
        const pos = this.deviceURL.indexOf('#');
        if(pos === -1) {
            return this.deviceURL;
        } else {
            return this.deviceURL.substring(0, pos);
        }
    }

    addChild(device: OverkizDevice) {
        this.child.push(device);
    }

    getManufacturer() {
        const manufacturer = this._look_state('core:ManufacturerNameState');
        return manufacturer !== null ? manufacturer : 'Somfy';
    }

    getModel() {
        const model = this._look_state('core:ModelState');
        return model !== null ? model : this.uiClass;
    }

    _look_state(stateName) {
        if(this.states !== null) {
            for (const state of this.states) {
                if (state.name === stateName) {
                    return state.value;
                }
            }
        }
        return null;
    }

    isCommandInProgress() {
        return (this.executionId in this.api.executionPool);
    }

    cancelCommand() {
        this.api.cancelCommand(this.executionId);
    }

    executeCommands(title, commands) {
        if (this.isCommandInProgress()) {
            this.cancelCommand();
        }

        title = this.label + ' - ' + title;
        const highPriority = this.states['io:PriorityLockLevelState'] ? true : false;
        const action = new Action(title, highPriority);
        action.deviceURL = this.deviceURL;
        action.commands = commands;

        return this.api.executeAction(action).then(() => action);
    }
}