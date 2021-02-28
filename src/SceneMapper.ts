import { Characteristics, Services } from './Platform';
import { Characteristic, CharacteristicSetCallback, CharacteristicValue, Logger, PlatformAccessory, Service, WithUUID } from 'homebridge';
import { Action, ExecutionState } from 'overkiz-client';
import { State } from 'overkiz-client';
import { Command } from 'overkiz-client';
import { Device } from 'overkiz-client';
import { Platform } from './Platform';
import { ActionGroup } from 'overkiz-client/dist/Client';

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

        this.on.on('set', this.setOn.bind(this));
    }

    private get isInProgress() {
        return (this.lastExecId in this.platform.client.executionPool);
    }

    protected async setOn(value, callback: CharacteristicSetCallback) {
        if (this.isInProgress) {
            await this.platform.client.cancelCommand(this.lastExecId);
        }

        const action = await this.platform.client.execute(this.action.oid, null);
        action.on('update', (state, data) => {
            switch (state) {
                case ExecutionState.INITIALIZED:
                    callback();
                    break;
                case ExecutionState.COMPLETED:
                case ExecutionState.FAILED:
                    this.log.info('[Scenario] ' + this.action.label + ' ' + (data === null ? state : data));
                    this.on?.updateValue(0);
                    break;
            }
        });
        callback();
    }

    protected onStateChanged(name: string, value): boolean {
        switch(name) {
            case 'core:OnOffState':
                this.on?.updateValue(value === 'on');
                break;
        }
        return false;
    }
}