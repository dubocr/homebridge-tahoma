export default class OverkizDevice {
    services: OverkizDevice[] = [];
    child: OverkizDevice[] = [];
    parent: OverkizDevice|null = null;
    name: string;
    merged = false;
    stateless = false;
    states = [];
    timeout: number|null = null;

    deviceURL = '';
    baseURL = '';

    constructor(device) {
        console.log('Instanciate ' + this.constructor.name + ' ' + device.label);
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
}