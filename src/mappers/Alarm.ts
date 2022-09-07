import { Characteristics, Services } from '../Platform';
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
        this.stayZones = config.stayZones || 'A';
        this.nightZones = config.nightZones || 'B';
        this.occupancySensor = config.occupancySensor || false;
    }


    protected registerMainService() {
        const service = this.registerService(Services.SecuritySystem);
        this.currentState = service.getCharacteristic(Characteristics.SecuritySystemCurrentState);
        this.targetState = service.getCharacteristic(Characteristics.SecuritySystemTargetState);

        this.targetState.onSet(this.setTargetState.bind(this));
        return service;
    }

    protected getTargetCommands(value): Command | Array<Command> {
        switch (value) {
            default:
            case Characteristics.SecuritySystemTargetState.STAY_ARM:
                return new Command('alarmZoneOn', [this.stayZones]);
            case Characteristics.SecuritySystemTargetState.NIGHT_ARM:
                return new Command('alarmZoneOn', [this.nightZones]);
            case Characteristics.SecuritySystemTargetState.AWAY_ARM:
                return new Command('alarmOn');
            case Characteristics.SecuritySystemTargetState.DISARM:
                return new Command('alarmOff');
        }
    }

    async setTargetState(value) {
        const action = await this.executeCommands(this.getTargetCommands(value));
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    if (this.stateless) {
                        this.currentState?.updateValue(value);
                    }
                    break;
                case ExecutionState.FAILED:
                    if (this.currentState &&
                        this.currentState.value !== Characteristics.SecuritySystemCurrentState.ALARM_TRIGGERED) {
                        this.targetState?.updateValue(this.currentState.value);
                    }
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value) {
        switch (name) {
            case 'core:ActiveZonesState':
                switch (value) {
                    default:
                    case '':
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.DISARMED);
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.DISARM);
                        break;
                    case this.stayZones:
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.STAY_ARM);
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.STAY_ARM);
                        break;
                    case 'A,B,C':
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.AWAY_ARM);
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.AWAY_ARM);
                        break;
                    case this.nightZones:
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.NIGHT_ARM);
                        this.targetState?.updateValue(Characteristics.SecuritySystemTargetState.NIGHT_ARM);
                        break;
                    case 'triggered':
                        this.currentState?.updateValue(Characteristics.SecuritySystemCurrentState.ALARM_TRIGGERED);
                        break;
                }
                break;
        }
    }
}