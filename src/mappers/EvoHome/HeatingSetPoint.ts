import HeatingSystem from '../HeatingSystem';

export default class HeatingSetPoint extends HeatingSystem {
    protected registerServices() {
        this.registerThermostatService();
        this.targetState?.setProps({ validValues: [
            this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
        ] });
    }
}