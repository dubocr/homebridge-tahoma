import { Characteristic } from 'homebridge';
import Mapper from '../Mapper';
import { Characteristics, Services } from '../Platform';

export default class RemoteController extends Mapper {
    protected event: Characteristic | undefined;
    
    protected registerServices() {
        const service = this.registerService(Services.StatelessProgrammableSwitch);
        this.event = service.getCharacteristic(Characteristics.ProgrammableSwitchEvent);
    }
/*
    protected onStateChanged(name: string, value) {
        switch(name) {
            //
        }
    }
*/
}