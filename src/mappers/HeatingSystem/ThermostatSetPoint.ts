import { Command } from 'overkiz-client';
import HeatingSystem from '../HeatingSystem';

export default class ThermostatSetPoint extends HeatingSystem {   
    
    protected registerServices() {
        this.registerThermostatService();
        
        if(this.targetState) {
            this.targetState.setProps({ validValues: [
                this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
            ] });
            this.targetState.value = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
        }
        if(this.currentState) {
            this.currentState.value = this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
        }
    }
    
    protected getTargetTemperatureCommands(value): Command | Array<Command> {
        return new Command('setHeatingTargetTemperature', value);
    }

    protected onStateChanged(name, value) {
        switch(name) {
            case 'zwave:SetPointHeatingValueState': this.onTemperatureUpdate(value); break;
        }
    }
}