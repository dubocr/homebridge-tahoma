
import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class VentilationSystem extends Mapper {
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(this.platform.Service.AirPurifier);
        this.currentState = service.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState);
        this.targetState = service.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState);

        this.targetState?.on('set', this.setTargetState.bind(this));
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch(value) {
            case this.platform.Characteristic.TargetAirPurifierState.AUTO:
                return new Command('setAirDemandMode', 'auto');
            case this.platform.Characteristic.TargetAirPurifierState.MANUAL:
            default:
                return new Command('setAirDemandMode', 'boost');
        }
    }

    protected async setTargetState(value, callback) {
        const action = await this.executeCommands(this.getTargetStateCommands(value), callback);
        action.on('update', (state) => {
            switch (state) {
                case ExecutionState.COMPLETED:
                    if(this.stateless) {
                        this.currentState?.updateValue(value);
                    }
                    break;
                case ExecutionState.FAILED:
                    if(this.currentState) {
                        this.targetState?.updateValue(this.currentState.value);
                    }
                    break;
            }
        });
    }

    protected onStateChanged(name: string, value) {
        switch(name) {
            case 'io:AirDemandModeState':
                switch(value) {
                    case 'auto':
                        this.currentState?.updateValue(this.platform.Characteristic.TargetAirPurifierState.AUTO);
                        break;
                    default:
                        this.currentState?.updateValue(this.platform.Characteristic.TargetAirPurifierState.MANUAL);
                        break;
                }
                break;
        }
    }
}