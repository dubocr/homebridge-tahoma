import { Characteristics, Services } from './Platform';
import { Characteristic, Logger, PlatformAccessory, Service } from 'homebridge';
import { ExecutionState, ActionGroup, Execution } from 'overkiz-client';
import { Platform } from './Platform';

export default class Mapper {
    protected log: Logger;
    protected services: Array<Service> = [];
    protected on: Characteristic | undefined;
    private lastExecId;

    constructor(
        protected readonly platform: Platform,
        protected readonly accessory: PlatformAccessory,
        protected readonly action: ActionGroup,
    ) {
        this.log = platform.log;

        const service = this.accessory.getService(Services.Switch) || this.accessory.addService(Services.Switch);
        this.on = service.getCharacteristic(Characteristics.On);

        this.on.onSet(this.setOn.bind(this));
        this.on.updateValue(0);
    }

    private get isInProgress() {
        return (this.lastExecId in this.platform.client.executionPool);
    }

    protected async setOn(value) {
        if(value) {
            const execution = new Execution('');
            this.lastExecId = await this.platform.client.execute(this.action.oid, execution);
            execution.on('update', (state, event) => {
                switch (state) {
                    case ExecutionState.COMPLETED:
                    case ExecutionState.FAILED:
                        this.log.info('[Scene] ' + this.action.label + ' ' + (state === ExecutionState.FAILED ? event.failureType : state));
                        this.on?.updateValue(0);
                        break;
                }
            });
        } else if(this.isInProgress) {
            await this.platform.client.cancelExecution(this.lastExecId);
        }
    }
}