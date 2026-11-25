import { Perms } from 'homebridge';
import { Characteristics } from '../../Platform.js';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem.js';

export default class AtlanticPassAPCHeatPump extends HeatingSystem {
    protected MIN_TEMP = 0;
    protected TARGET_MODES = [
        Characteristics.TargetHeatingCoolingState.AUTO,
        Characteristics.TargetHeatingCoolingState.HEAT,
        Characteristics.TargetHeatingCoolingState.COOL,
        Characteristics.TargetHeatingCoolingState.OFF,
    ];

    protected applyConfig(config) {
        super.applyConfig(config);

        const thermalConfigurations = this.platform.devices
            .filter(device => device.parent === this.device)
            .map(device => device.get('core:ThermalConfigurationState'));

        const supportsHeating = thermalConfigurations.some(configuration =>
            configuration === 'heating' || configuration === 'heatingAndCooling',
        );
        const supportsCooling = thermalConfigurations.some(configuration =>
            configuration === 'cooling' || configuration === 'heatingAndCooling',
        );

        if (!supportsHeating && !supportsCooling) {
            return;
        }

        this.TARGET_MODES = [
            ...(supportsHeating ? [Characteristics.TargetHeatingCoolingState.HEAT] : []),
            ...(supportsCooling ? [Characteristics.TargetHeatingCoolingState.COOL] : []),
            Characteristics.TargetHeatingCoolingState.OFF,
        ];
    }

    protected registerMainService() {
        const service = super.registerMainService();
        this.targetTemperature?.setProps({ perms: [Perms.PAIRED_READ, Perms.EVENTS] });
        return service;
    }

    protected getTargetStateCommands(value): Command | Array<Command> | undefined {
        if (!this.TARGET_MODES.includes(value)) {
            this.log.warn(`Ignoring unsupported operating mode for ${this.device.label}: ${value}`);
            return undefined;
        }

        switch (value) {
            case Characteristics.TargetHeatingCoolingState.AUTO:
                return new Command('setPassAPCOperatingMode', 'heating');

            case Characteristics.TargetHeatingCoolingState.HEAT:
                return new Command('setPassAPCOperatingMode', 'heating');

            case Characteristics.TargetHeatingCoolingState.COOL:
                return new Command('setPassAPCOperatingMode', 'cooling');

            default:
            case Characteristics.TargetHeatingCoolingState.OFF:
                return new Command('setPassAPCOperatingMode', 'stop');
        }
    }


    protected getTargetTemperatureCommands(): Command | Array<Command> {
        return [];
    }

    protected onStateChanged(name, value) {
        switch (name) {
            case 'io:PassAPCOperatingModeState':
                this.postpone(this.computeStates);
                break;
            default:
                super.onStateChanged(name, value);
                break;
        }
    }

    protected computeStates() {
        let targetState;
        switch (this.device.get('io:PassAPCOperatingModeState')) {
            case 'heating':
                targetState = Characteristics.TargetHeatingCoolingState.HEAT;
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.HEAT);
                break;
            case 'cooling':
                targetState = Characteristics.TargetHeatingCoolingState.COOL;
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.COOL);
                break;
            case 'stop':
                targetState = Characteristics.TargetHeatingCoolingState.OFF;
                this.currentState?.updateValue(Characteristics.CurrentHeatingCoolingState.OFF);
                break;
        }


        if (this.targetState !== undefined && typeof targetState === 'number' && this.isIdle) {
            this.targetState.updateValue(targetState);
        }
    }
}
