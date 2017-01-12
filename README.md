# homebridge-overkiz

Supports Overkiz platform (TaHoma, Cozytouch) on HomeBridge

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-overkiz
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
            	"platform": "Overkiz",
            	"name": "Overkiz",
            	"user": "[user]",
            	"password": "[password]",
	    		"service": "Service name (TaHoma, Cozytouch)"
        	}
        ]
    }
```