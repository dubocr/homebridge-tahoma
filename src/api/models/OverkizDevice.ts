import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import OverkizClient from '../OverkizClient';

export default class OverkizDevice {
    
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
        this.oid = json.oid;
        this.deviceURL = json.deviceURL;
        this.label = json.label;
        this.uiClass = json.uiClass;
        this.widget = json.widget;
        this.states = json.states;
        this.definition.commands = json.definition.commands;
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
        return (this.executionId in this.api.executionCallback);
    }

    cancelCommand() {
        this.api.cancelCommand(this.executionId);
    }

    executeCommand(label, commands) {
        if (this.isCommandInProgress()) {
            this.cancelCommand();
        }

        const command = {
            label: this.label + ' - ' + label + ' - HomeKit',
            deviceURL: this.deviceURL,
            commands: commands,
            highPriority: this.states['io:PriorityLockLevelState'] ? true : false,
        };
        return this.api.executeCommand(command);
        /*.catch((error, data) => {
                let deviceError = null;
                if(error && data && data.failedCommands) {
                    if(data && data.failedCommands) {
                        for(const fail of data.failedCommands) {
                            if(fail.deviceURL === this.deviceURL) {
                                deviceError = fail.failureType;
                            }
                        }
                    } else {
                        deviceError = error;
                    }
                }
                if(deviceError) {
                    throw new Error(deviceError);
                }
            })*/
    }
}