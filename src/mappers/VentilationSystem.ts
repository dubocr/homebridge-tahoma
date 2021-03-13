import { Characteristics, Services } from '../Platform';
import { Characteristic } from 'homebridge';
import { Command, ExecutionState } from 'overkiz-client';
import Mapper from '../Mapper';

export default class VentilationSystem extends Mapper {
    protected active: Characteristic | undefined;
    protected currentState: Characteristic | undefined;
    protected targetState: Characteristic | undefined;

    protected registerServices() {
        const service = this.registerService(Services.AirPurifier);
        this.active = service.getCharacteristic(Characteristics.Active);
        this.currentState = service.getCharacteristic(Characteristics.CurrentAirPurifierState);
        this.targetState = service.getCharacteristic(Characteristics.TargetAirPurifierState);

        this.targetState?.onSet(this.setTargetState.bind(this));
    }

    protected getTargetStateCommands(value): Command | Array<Command> {
        switch(value) {
            case Characteristics.TargetAirPurifierState.AUTO:
                return new Command('setAirDemandMode', 'auto');
            case Characteristics.TargetAirPurifierState.MANUAL:
            default:
                return new Command('setAirDemandMode', 'boost');
        }
    }

    protected async setTargetState(value) {
        const action = await this.executeCommands(this.getTargetStateCommands(value));
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
                        this.targetState?.updateValue(Characteristics.TargetAirPurifierState.AUTO);
                        break;
                    default:
                        this.targetState?.updateValue(Characteristics.TargetAirPurifierState.MANUAL);
                        break;
                }
                break;
        }
    }
}