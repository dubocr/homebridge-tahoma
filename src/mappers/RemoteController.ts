import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';
import { Characteristics, Services } from '../Platform';

export default class RemoteController extends Mapper {
    protected event: Characteristic | undefined;

    protected registerMainService() {
        throw new Error('Service RemoteController not implemented');
        const service = this.registerService(Services.StatelessProgrammableSwitch);
        this.event = service.getCharacteristic(Characteristics.ProgrammableSwitchEvent);
        return service;
    }
    
    
    protected onStateChanged(name: string, value) {
        switch(name) {
            default: this.event?.updateValue(value);
        }
    }
}