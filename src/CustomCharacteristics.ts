import { HAP, Characteristic, Perms, Formats, WithUUID } from 'homebridge';

export let CurrentShowerCharacteristic: WithUUID<{ new(): Characteristic }>;
export let TargetShowerCharacteristic: WithUUID<{ new(): Characteristic }>;
export let MyPositionCharacteristic: WithUUID<{ new(): Characteristic }>;
export let ProgCharacteristic: WithUUID<{ new(): Characteristic }>;
export let EcoCharacteristic: WithUUID<{ new(): Characteristic }>;

export class CustomCharacteristics {
    constructor(hap: HAP) {
        CurrentShowerCharacteristic = class extends hap.Characteristic {

            public static readonly UUID: string = '10000001-0000-1000-8000-0026BB765291';

            constructor() {
                super('Current Shower', CurrentShowerCharacteristic.UUID, {
                    format: Formats.INT,
                    minValue: 0,
                    maxValue: 8,
                    minStep: 1,
                    perms: [Perms.NOTIFY, Perms.PAIRED_READ],
                });
                this.value = this.getDefaultValue();
            }
        };

        TargetShowerCharacteristic = class extends hap.Characteristic {

            public static readonly UUID: string = '10000002-0000-1000-8000-0026BB765291';

            constructor() {
                super('Target Shower', TargetShowerCharacteristic.UUID, {
                    format: Formats.INT,
                    minValue: 0,
                    maxValue: 8,
                    minStep: 1,
                    perms: [Perms.NOTIFY, Perms.PAIRED_READ, Perms.PAIRED_WRITE],
                });
                this.value = this.getDefaultValue();
            }
        };

        MyPositionCharacteristic = class extends hap.Characteristic {

            public static readonly UUID: string = '10000003-0000-1000-8000-0026BB765291';

            constructor() {
                super('My', MyPositionCharacteristic.UUID, {
                    format: Formats.BOOL,
                    perms: [Perms.NOTIFY, Perms.PAIRED_READ, Perms.PAIRED_WRITE],
                });
                this.value = this.getDefaultValue();
            }
        };

        ProgCharacteristic = class extends hap.Characteristic {

            public static readonly UUID: string = '10000004-0000-1000-8000-0026BB765291';

            constructor() {
                super('Prog', ProgCharacteristic.UUID, {
                    format: Formats.BOOL,
                    perms: [Perms.NOTIFY, Perms.PAIRED_READ, Perms.PAIRED_WRITE],
                });
                this.value = this.getDefaultValue();
            }
        };

        EcoCharacteristic = class extends hap.Characteristic {

            public static readonly UUID: string = '10000005-0000-1000-8000-0026BB765291';

            constructor() {
                super('Eco', EcoCharacteristic.UUID, {
                    format: Formats.BOOL,
                    perms: [Perms.NOTIFY, Perms.PAIRED_READ, Perms.PAIRED_WRITE],
                });
                this.value = this.getDefaultValue();
            }
        };
    }
}