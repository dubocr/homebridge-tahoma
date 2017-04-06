# homebridge-tahoma

Supports Overkiz platform (TaHoma, Cozytouch) on HomeBridge

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-tahoma
3. Update your configuration file. See bellow for a sample. 

# Configuration

Minimal configuration sample:
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
			"user": "user@me.com",
			"password": "MyPassw0rd",
		}
	]
}
```

Configuration parameters:

| Parameter                  | Type			| Default		| Note                                                                                                                                                                  |
|----------------------------|----------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `user`               		   | String		| null			| mandatory, your TaHoma/Cozytouch account username                                                                                                                     |
| `password`             	   | String		| null			| mandatory, your TaHoma/Cozytouch account password                                                                                                                     |
| `service`              	   | String		| 'TaHoma'	| optional, service name ('TaHoma' or 'Cozytouch')																																																											|
| `refreshPeriod`            | Integer	| 600				| optional, device states refresh period in seconds							 																										 																										|
| `exclude`		               | String[]	| []				| optional, list of protocols (hue,enocean,zwave,io,rts) or device (name) to exclude																																										|
| `exposeScenarios`	         | Boolean	| false			| optional, expose TaHoma/Cozytouch scenarios as HomeKit switches. Could also specify a list of string corresponding to scenarios names to expose												|
| `Alarm`		                 | Object		| {}				| optional, Alarm configuration object (see below)																											 																																|
                                                                     												     																 																																		 
| Alarm parameters           | Type			| Default		| Note                                                                                                                                                                  |
|----------------------------|----------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `STAY_ARM`               	 | String		| 'A'				| optional, active zones (A,B,C) in 'Stay' mode                                                                             																						|
| `NIGHT_ARM`             	 | String		| 'B'				| optional, active zones (A,B,C) in 'Night' mode                                                                          																							|


Full configuration example:
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
			"user": "user@me.com",
			"password": "MyPassw0rd",
			"service": "TaHoma",
			"exclude": ["hue","rts","Garage Door"],
			"Alarm": {
				"STAY_ARM": "A,C",
				"NIGHT_ARM": "B"
			}
		}
	]
}
```

# Limitation

Tested device : 
- RollerShutter
- Alarm
- DoorLock
- GarageDoor
- Gate
- Light
- ContactSensor
- OccupancySensor
- ElectricitySensor
- LightSensor
- TemperatureSensor

Not tested devices : 
- HeatingSystem
- OnOff
- SmokeSensor

# Contribute

You are welcome to contribute to this plugin development by adding new kind of devices by adding implementation `.js` file in `accessories` folder.
Please have a look to `RollerShutter.js` file for example.
