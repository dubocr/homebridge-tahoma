import { Characteristic, CharacteristicSetCallback } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class Alarm extends Mapper {
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected stayZones: unknown | undefined;
    protected nightZones: unknown | undefined;
    protected occupancySensor: unknown | undefined;

    protected applyConfig(config) {
        this.stayZones = config.STAY_ARM || 'A';
        this.nightZones = config.NIGHT_ARM || 'B';
        this.occupancySensor = config.occupancySensor || false;
    }


    protected registerServices() {
        const service = this.registerService(this.platform.Service.SecuritySystem);
        this.currentState = service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState);
        this.targetState = service.getCharacteristic(this.platform.Characteristic.SecuritySystemTargetState);

        this.targetState.on('set', this.setTargetState.bind(this));
    }

    protected getTargetCommands(value): Command | Array<Command> {
        switch(value) {
            default:
            case this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM:
                return new Command('alarmZoneOn', [this.stayZones]);
            case this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                return new Command('alarmZoneOn', [this.nightZones]);
            case this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM:
                return new Command('alarmOn');
            case this.platform.Characteristic.SecuritySystemTargetState.DISARM:
                return new Command('alarmOff');
        }
    }

    async setTargetState(value, callback: CharacteristicSetCallback) {
        const action = await this.executeCommands(this.getTargetCommands(value), callback);
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    if(this.stateless) {
                        this.currentState?.updateValue(value);
                    }
                    break;
                case ExecutionState.FAILED:
                    if(this.currentState &&
                        this.currentState.value !== this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED) {
                        this.targetState?.updateValue(this.currentState.value);
                    }
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'core:ActiveZonesState':
                switch(value) {
                    default:
                    case '': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.DISARMED);
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.DISARM);
                        break;
                    case this.stayZones: 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM);
                            this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM);
                        break;
                    case 'A,B,C': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM);
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM);
                        break;
                    case this.nightZones: 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM);
                        this.targetState?.updateValue(this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM);
                        break;
                    case 'triggered': 
                        this.currentState?.updateValue(this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
                        break;
                }
                break;
        }
    }
}