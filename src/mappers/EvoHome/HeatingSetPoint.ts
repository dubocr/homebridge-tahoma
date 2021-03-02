import { Characteristics } from '../../Platform';
import HeatingSystem from '../HeatingSystem';

export default class HeatingSetPoint extends HeatingSystem {
    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ validValues: [
            Characteristics.TargetHeatingCoolingState.AUTO,
        ] });
        this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.AUTO);
    }
}