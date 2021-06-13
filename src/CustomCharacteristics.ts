import { HAP, Characteristic, Perms, Formats, WithUUID } from 'homebridge';

export let CurrentShowerCharacteristic: WithUUID<{ new(): Characteristic }>;
export let TargetShowerCharacteristic: WithUUID<{ new(): Characteristic }>;
export let MyPositionCharacteristic: WithUUID<{ new(): Characteristic }>;
export let ValvePositionCharacteristic: WithUUID<{ new(): Characteristic }>;
export let ProgramCommandCharacteristic: WithUUID<{ new(): Characteristic }>;
export let ProgramDataCharacteristic: WithUUID<{ new(): Characteristic }>;

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

        ValvePositionCharacteristic = class extends hap.Characteristic {

            public static readonly UUID: string = 'E863F12E-079E-48FF-8F27-9C2605A29F52';

            constructor() {
                super('ValvePosition', ValvePositionCharacteristic.UUID, {
                    format: Formats.UINT8,
                    perms: [Perms.NOTIFY, Perms.PAIRED_READ],
                });
                this.value = this.getDefaultValue();
            }
        };

        ProgramCommandCharacteristic = class extends hap.Characteristic {

            public static readonly UUID: string = 'E863F12C-079E-48FF-8F27-9C2605A29F52';

            constructor() {
                super('ProgramCommand', ProgramCommandCharacteristic.UUID, {
                    format: Formats.DATA,
                    perms: [Perms.NOTIFY, Perms.PAIRED_WRITE],
                });
                this.value = this.getDefaultValue();
            }
        };

        ProgramDataCharacteristic = class extends hap.Characteristic {

            public static readonly UUID: string = 'E863F12F-079E-48FF-8F27-9C2605A29F52';

            constructor() {
                super('ProgramData', ProgramDataCharacteristic.UUID, {
                    format: Formats.DATA,
                    perms: [Perms.NOTIFY, Perms.PAIRED_READ],
                });
                this.value = this.getDefaultValue();
            }
        };
    }
}