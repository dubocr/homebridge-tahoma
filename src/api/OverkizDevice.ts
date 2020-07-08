export default class OverkizDevice {
    uiClass;
    services: OverkizDevice[] = [];
    child: OverkizDevice[] = [];
    parent: OverkizDevice|null = null;
    name: string;
    merged = false;
    stateless = false;
    states;
    timeout: number|null = null;

    deviceURL = '';
    baseURL = '';

    constructor(device) {
        Object.assign(this, device);
        this.services = [];
        this.child = [];
        this.parent = null;
        this.merged = false;
        this.timeout = null;

        this.name = device.label;
        this.baseURL = this.getBaseURL();

        if(this.states === undefined) {
            this.stateless = true;
        }
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
}