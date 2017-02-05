# homebridge-tahoma

Supports Overkiz platform (TaHoma, Cozytouch) on HomeBridge

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-tahoma
3. Update your configuration file. See bellow for a sample. 

# Configuration

Configuration sample:

 ```
    {
        "bridge": {
            ...
        },
        
        "description": "...",

        "accessories": [],

        "platforms":[
        	{
            	"platform": "Tahoma",
            	"name": "Tahoma",
            	"user": "[user]",
            	"password": "[password]",
	    		"service": "Service name (TaHoma, Cozytouch)"
        	}
        ]
    }
```

| Parameter                  | Note                                                                                                                                                                  |
|----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `user`               		 | mandatory, your TaHoma/Cozytouch account username                                                                                                                     |
| `password`             	 | mandatory, your TaHoma/Cozytouch account username                                                                                                                     |
| `service`              	 | optional, service name in [TaHoma, Cozytouch], default: TaHoma                                                                                                        |
| `refreshPeriod`            | optional, device states refresh period in minute, default: 10                                                                                                         |

# Limitation

Tested device : 
- RollerShutter

Read-only tested devices : 
- Alarm
- DoorLock
- GarageDoor
- Gate

Not tested devices : 
- HeatingSystem
- OnOff
- Light

# Contribute

You are welcome to contribute to this plugin development by adding new kind of devices by adding implementation `.js` file in `accessories` folder.
Please have a look to `RollerShutter.js` file for example.