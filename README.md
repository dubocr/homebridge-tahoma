# homebridge-tahoma

Supports TaHoma (Somfy), Connexoon (Somfy), Cozytouch (Atlantic,Thermor,Sauter) and E.Connect 2 (Rexel) platforms on HomeBridge

# Main plugin upgrade

New plugin release 1.x.x will have many breaking changes. It will offer better stability for future development but this imply breaking devices identifiers from previous releases.
After installing, this version, your devices will be removed from Homekit automation and you will have to configure them again.
We appologize for that.

Be careful to update your config file based on following documentation or using Hoobs/Homebridge-UI plugin config management.

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-tahoma`
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
			"name": "My TaHoma Box",

			"service": "tahoma",
			"user": "user@me.com",
			"password": "MyPassw0rd",
		}
	]
}
```

Configuration parameters:

| Parameter                  | Type			| Default		| Note                                                                                                                                                                  |
|----------------------------|----------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `service`              	 | String		| 'tahoma'			| optional, service name ('tahoma', 'connexoon', 'connexoon_rts', 'cozytouch' or 'rexel')																																																											|

| `user`               		 | String		| null				| mandatory, your TaHoma/Connexoon/Cozytouch/E.Connect account username                                                                                                                     |
| `password`             	 | String		| null				| mandatory, your TaHoma/Connexoon/Cozytouch/E.Connect account password                                                                                                                     |

| `refreshPeriod`            | Integer	| 1800					| optional, device states refresh period in seconds							 																										 																										|
| `pollingPeriod`            | Integer	| 0						| optional, bridge polling period in seconds for sensors events (0: no polling)							 																										 																										|
| `exclude`		             | String[]	| []					| optional, list of protocols (hue,enocean,zwave,io,rts), ui name, widget name or device name to exclude																																										|
| `exposeScenarios`	         | Boolean	| false					| optional, expose TaHoma/Connexoon/Cozytouch scenarios as HomeKit switches. Could also specify a list of string corresponding to scenarios names to expose												|
| `devicesConfig`		             | Array		| []				| optional list of device specific configuration (see below)										|																 																																|

# Specific device configuration

This option allows you to apply a specific configuation to device or group of device.
One configuration is composed of a `key` attribute containing device name, widget, uiClass, protocol or unique identifier and as many parameter depending of device type.

```
{
	"key": "Bedroom door",
	"param1": "value1"
}
```

| Alarm parameters           | Type			| Default			| Note                                                                                                                                                                  |
|----------------------------|--------------|-------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `stayZones`               	 | String		| 'A'				| optional, active zones (A,B,C) in 'Stay' mode                                                                             																						|
| `nightZones`             	 | String		| 'B'				| optional, active zones (A,B,C) in 'Night' mode                                                                          																							|
| `occupancySensor`        	 | Boolean		| false				| optional, add an occupancy widget linked to the alarm                                                                          																							|

| WindowCovering parameters   | Type			| Default		| Note                                                                                                                                                                  |
|----------------------------|----------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `defaultPosition`	         | Integer	| 0				| optional, final position for UpDown rollershutter after any command												|
| `reverse`	         		 | Boolean	| false			| optional, reverse up/down in case of bad mounting												|
| `blindMode`	       		 | String	| null			| optional, change main slider action to orientation. By default, both closure and orientation will be set. When setting ``blindMode: true`` the blinds work in the following way: Opening the blinds or setting them to 100% will fully open them. Closing the blinds or setting them to 0% will fully close them. Setting the blinds to a value between 1% and 99% will first close the blinds and then adjust thier horizontal tilt in a way that 99% means fully horizonal = more light, and 1% means nearly closed = less light. |

| GarageDoorOpener parameters| Type			| Default		| Note                                                                                                                                                                  |
|----------------------------|----------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `cyclic`	         		| Boolean	| false			| optional, activate restoring initial state for cyclic device without states							|
| `reverse`	         		 | Boolean	| false			| optional, reverse up/down in case of bad mounting												|


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
			"name": "My Tahoma Bridge",

			"user": "user@me.com",
			"password": "MyPassw0rd",
			"service": "tahoma",
			"exclude": ["hue", "rts", "Main door"],

			"devicesConfig": [
				{
					"key": "Alarm",
					"stayZones": "A,C"
				},
				{
					"key": "Bedroom blind",
					"blindMode": true
				},
				{
					"key": "GarageDoor",
					"reverse": true
				},
				{
					"key": "UpDownRollerShutter",
					"defaultPosition": 50
				}
			]
		}
	]
}
```

# Contribute

You are welcome to contribute to this plugin development by opening an issue in case of bad behaviour or not implemented device.

Any support request must follow this process :
1. Execute failling operations from official app then from Homekit
2. Report your config to [https://dev.duboc.pro/tahoma](https://dev.duboc.pro/tahoma)
3. Browse or open issue with title corresponding to your device widget name (see picture below)
4. Provide your bridge last 4 digits (number visible as SETUP-XXXX-XXXX-XXXX at step 2.)
![Widget](https://dev.duboc.pro/img/widgets.png)

I do not expect any reward concerning this plugin, however, some users ask me for a [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=L4X489MG7FUCN) button as sign of contribution. Feel free to use it.
