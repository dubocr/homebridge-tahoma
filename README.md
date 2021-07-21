# homebridge-tahoma

Homebridge plugin supporting Overkiz based platforms :

| Product			| Vendor					| Service			|
|---------------------------|-------------------------------|-------------------|
| TaHoma / TaHoma Switch 	| Somfy							| `tahoma`	    	|
| Connexoon 				| Somfy							| `tahoma`	    	|
| Connexoon RTS 			| Somfy							| `connexoon_rts`	|
| Cozytouch				 	| Atlantic / Thermor / Sauter	| `cozytouch`		|
| Energeasy Connect			| Rexel							| `rexel`			|
| Kit de connectivité Somfy | Orange						| `tahoma`	    	|

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

| Parameter					| Type			| Default		| Note							|
|---------------------------|--------------|---------------|-------------------------------|
| `service`					| String		| 'tahoma'	    | optional, service name ('tahoma', 'connexoon_rts', 'cozytouch' or 'rexel')	|
| `user`					| String		| null			| mandatory, your service account username	|
| `password`				| String		| null			| mandatory, your service account password	|
| `pollingPeriod`			| Integer		| 30			| optional, bridge polling period in seconds	|
| `refreshPeriod`			| Integer		| 30			| optional, device states refresh period in minutes	|
| `exclude`					| String[]		| []			| optional, list of protocols (hue,enocean,zwave,io,rts), ui name, widget name or device name to exclude	|
| `exposeScenarios`			| Boolean		| false			| optional, expose TaHoma/Connexoon/Cozytouch scenarios as HomeKit switches. Could also specify a list of string corresponding to scenarios names to expose	|
| `devicesConfig`			| Object[]		| []			| optional list of device specific configuration (see below)	|

# Specific device configuration

This option allows you to apply a specific configuation to device or group of device.
One configuration is composed of a `key` attribute containing device name, widget, uiClass, protocol or unique identifier and as many parameter depending of device type.

```
{
	"key": "Bedroom door",
	"param1": "value1"
	...
}
```

| Alarm parameters	| Type		| Default		| Note					|
|-------------------|-----------|---------------|-----------------------|
| `stayZones`		| String	| 'A'			| optional, active zones (A,B,C) in 'Stay' mode	|
| `nightZones`		| String	| 'B'			| optional, active zones (A,B,C) in 'Night' mode	|
| `occupancySensor`	| Boolean	| false			| optional, add an occupancy widget linked to the alarm	|

| WindowCovering parameters	| Type		| Default		| Note			|
|---------------------------|-----------|---------------|---------------|
| `defaultPosition`			| Integer	| 0				| optional, final position for UpDown rollershutter after any command	|
| `reverse`					| Boolean	| false			| optional, reverse up/down in case of bad mounting	|
| `lowSpeed`				| Boolean / String	| false			| optional, use low speed for roller shutter supporting it. If string, specify slot time with format "HH:MM-HH:MM". Low speed will be enabled between them.	|
| `blindMode`				| String	| null			| optional, change main slider action to orientation. By default, both closure and orientation will be set. When setting ``blindMode: true`` the blinds work in the following way: Opening the blinds or setting them to 100% will fully open them. Closing the blinds or setting them to 0% will fully close them. Setting the blinds to a value between 1% and 99% will first close the blinds and then adjust thier horizontal tilt in a way that 99% means fully horizonal = more light, and 1% means nearly closed = less light. |
| `blindsOnRollerShutter`	| Boolean	| false				| optional, when blinds are installed on roller shutter motors allow slats to stay horizontal (opened) at intermediate position |
| `movementDuration`		| Integer	| 0				| optional, duration of a full shutter movement from 'open' to 'close' in seconds. Will be used to approximate shutter intermediate position. (0 = disable feature) |

| GarageDoorOpener parameters	| Type			| Default		| Note				|
|-------------------------------|---------------|---------------|-------------------|
| `cyclic`						| Boolean		| false			| optional, restore closed state after `cycleDuration` seconds for stateless devices with cyclic behaviour	|
| `cycleDuration`				| Integer		| false			| optional, cycle duration (in seconds) for cyclic mode (default: 5 sec)				|
| `reverse`						| Boolean		| false			| optional, reverse up/down in case of bad mounting	|
| `pedestrianDuration`			| Integer		| 0				| optional, duration for pedestrian position for RTS gates	|

| HeatingSystem parameters		| Type			| Default		| Note				|
|-------------------------------|---------------|---------------|-------------------|
| `derogationDuration`			| Integer		| 1				| optional, duration (in hours) for derogation orders	|
| `comfort`						| Integer		| 19			| optional, comfort temperature used as display for heaters controled by pilot wire	|
| `eco`							| Integer		| 17			| optional, comfort temperature used as display for heaters controled by pilot wire		|


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
