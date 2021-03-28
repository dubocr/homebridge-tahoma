import { Characteristics } from '../../Platform';
import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class ThermostatSetPoint extends HeatingSystem {   
    
    protected registerServices() {
        this.registerThermostatService();

        if(this.targetState) {
            this.targetState.setProps({
                validValues: [
                    Characteristics.TargetHeatingCoolingState.HEAT,
                ],
            });
            this.targetState.value = Characteristics.TargetHeatingCoolingState.HEAT;
        }
        if(this.currentState) {
            this.currentState.value = Characteristics.CurrentHeatingCoolingState.HEAT;
        }
    }
    
    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        return new Command('setHeatingTargetTemperature', value);
    }

    protected onStateChanged(name, value) {
        switch(name) {
            case 'zwave:SetPointHeatingValueState':
            case 'core:RoomTemperatureState':
                this.onTemperatureUpdate(value);
                break;
            case 'core:HeatingTargetTemperatureState':
                this.targetTemperature?.updateValue(value);
                break;
        }
    }
}