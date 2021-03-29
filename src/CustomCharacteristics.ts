import { HAP, Characteristic, Perms, Formats, WithUUID } from 'homebridge';

export let ShowersCharacteristic: WithUUID<{new (): Characteristic}>;

export class CustomCharacteristics {
    constructor(hap: HAP) {
        ShowersCharacteristic = class extends hap.Characteristic {

            public static readonly UUID: string = '10000001-0000-1000-8000-0026BB765291';
        
            constructor() {
                super('Remaining Showers', ShowersCharacteristic.UUID, {
                    format: Formats.INT,
                    minValue: 0,
                    maxValue: 8,
                    minStep: 1,
                    perms: [Perms.PAIRED_READ, Perms.NOTIFY],
                });
                this.value = this.getDefaultValue();
            }
        };
    }
}