var Log;

class AbstractService {
    constructor(homebridge, log, device) {
    	Log = log;
    	this.device = device;
    }

    onStateUpdate(name, value) {
        Log("onStateUpdate not implemented");
    }
    
    getHapService() {
    	return this.service;
    }
}

module.exports = AbstractService;