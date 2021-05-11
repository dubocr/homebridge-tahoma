import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class AtlanticPassAPCHeatingAndCoolingZone extends HeatingSystem {
    protected MIN_TEMP = 16;
    protected MAX_TEMP = 30;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    private refreshStatesTimeout;

    protected applyConfig(config) {
        super.applyConfig(config);
    }

    protected registerServices() {
        this.registerThermostatService();
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        const heatingCooling = this.getHeatingCooling();
        const commands: Array<Command> = [];
        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                commands.push(new Command('set' + heatingCooling + 'OnOffState', 'on'));
                commands.push(new Command('setPassAPC' + heatingCooling + 'Mode', this.enableProg ? 'internalScheduling' : 'manu'));
                break;

            case Characteristics.TargetHeatingCoolingState.OFF:
                commands.push(new Command('set' + heatingCooling + 'OnOffState', 'off'));
                break;
        }

        return commands;
    }

    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        const heatingCooling = this.getHeatingCooling();
        if (this.enableProg) {
            if (this.device.hasCommand('setDerogatedTargetTemperature')) {
                // AtlanticPassAPCHeatPump
                return [
                    new Command('setDerogatedTargetTemperature', value),
                    new Command('setDerogationTime', this.derogationDuration),
                    new Command('setDerogationOnOffState', 'on'),
                ];
            } else {
                const profile = this.getProfile();
                return new Command(`set${profile}${heatingCooling}TargetTemperature`, value);
            }
        } else {
            if (this.device.hasCommand(`set${heatingCooling}TargetTemperature`)) {
                // AtlanticPassAPCZoneControl
                return new Command(`set${heatingCooling}TargetTemperature`, value);
            } else {
                // AtlanticPassAPCHeatPump
                return new Command(`setComfort${heatingCooling}TargetTemperature`, value);
            }
        }
    }

    protected onStateChanged(name, value) {
        switch (name) {
            case 'core:TemperatureState':
                this.onTemperatureUpdate(value);
                break;
            case 'core:TargetTemperatureState':
                if (value >= 16) {
                    this.targetTemperature?.updateValue(value);
                }
                break;
            case 'core:HeatingOnOffState':
            case 'core:CoolingOnOffState':
            case 'io:PassAPCHeatingModeState':
            case 'io:PassAPCCoolingModeState':
            case 'io:PassAPCHeatingProfileState':
            case 'io:PassAPCCoolingProfileState':
                this.postpone(this.computeStates);
        }
    }

    protected computeStates() {
        let targetState;
        let targetTemperature;
        const heatingCooling = this.getHeatingCooling();

        if (this.device.get(`core:${heatingCooling}OnOffState`) === 'off') {
            targetState = Characteristics.TargetHeatingCoolingState.OFF;
            this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
        } else {
            targetTemperature = targetTemperature = this.device.get(`core:${heatingCooling}TargetTemperatureState`) ||
                this.device.get('core:TargetTemperatureState');
            const currentTemperature = this.currentTemperature?.value || targetTemperature;
            if (heatingCooling === 'Heating') {
                if (currentTemperature >= (targetTemperature + 0.5)) {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                } else {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                }
            } else {
                if (currentTemperature <= (targetTemperature - 0.5)) {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                } else {
                    this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                }
            }
            targetState = Characteristics.TargetHeatingCoolingState.AUTO;
        }

        if (this.targetState !== undefined && targetState !== undefined && this.isIdle) {
            this.targetState.updateValue(targetState);
        }

        if (this.targetTemperature !== undefined && targetTemperature >= 16 && this.isIdle) {
            this.targetTemperature.updateValue(targetTemperature);
        }
    }

    /**
     * Helpers
     */
    private getHeatingCooling() {
        const operatingMode = this.device.parent?.get('io:PassAPCOperatingModeState');
        if (operatingMode === 'cooling') {
            return 'Cooling';
        } else {
            return 'Heating';
        }
    }

    private getProfile() {
        const heatingCooling = this.getHeatingCooling();
        if (this.device.get(`core:Eco${heatingCooling}TargetTemperatureState`) === this.device.get('core:TargetTemperatureState')) {
            return 'Eco';
        } else {
            return 'Comfort';
        }
    }

    private launchRefreshStates() {
        clearTimeout(this.refreshStatesTimeout);
        this.refreshStatesTimeout = setTimeout(() => {
            const commands = [
                new Command('refreshTargetTemperature'),
                new Command('refreshPassAPCHeatingProfile'),
            ];
            this.executeCommands(commands);
        }, 30 * 1000);
    }

    private launchRefreshTemperature() {
        clearTimeout(this.refreshStatesTimeout);
        this.refreshStatesTimeout = setTimeout(() => {
            this.executeCommands(new Command('refreshTargetTemperature'));
        }, 30 * 1000);
    }
}