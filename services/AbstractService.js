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

    refreshState(name) {
    	this.device.getState(name, function(error, value) {
    		if(!error) {
                this.device.states[name] = value;
    			this.onStateUpdate(name, value);
    		} else {
    			Log("Unable to refresh " + name + " state");
    		}
    	});
    }
	
	merge() {
		
	}
}

module.exports = AbstractService;