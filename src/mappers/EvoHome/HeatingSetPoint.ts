import { Characteristics } from '../../Platform.js';
import HeatingSystem from '../HeatingSystem.js';

export default class HeatingSetPoint extends HeatingSystem {
    protected registerMainService() {
        const service = super.registerMainService();
        this.targetState?.setProps({ validValues: [
            Characteristics.TargetHeatingCoolingState.AUTO,
        ] });
        this.targetState?.updateValue(Characteristics.TargetHeatingCoolingState.AUTO);
        return service;
    }
}