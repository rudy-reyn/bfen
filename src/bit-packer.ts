// bit-packing.ts

/*
The following is partially sourced from Low Byte Productions, formerly Low Level JavaScript,
at https://www.youtube.com/watch?v=132wDVovzhw
*/


export class BitDescriptor {
    value: number;
    bits: number;

    constructor(value: number, bits: number) {
        const isPosInt = n => Number.isInteger(n) && n > -1
        const posIntErr = s => new Error(`Expected a positive integer for ${s}`)

        if (!isPosInt(value)) {
            throw posIntErr('value')
        }
        if (!isPosInt(bits)) {
            throw posIntErr('bits')
        }
        this.value = value;
        this.bits = bits;
    }

    static fromString(value: string) {
        const binaryRegex = /^(0|1)+/;
        if (!(binaryRegex.test(value))) {
            throw new Error('Expected a binary string');
        }
        return new BitDescriptor(parseInt(value, 2), value.length);
    }
}

export class BitPacker {
    static pack(descriptors: Array<BitDescriptor>): Uint8Array {
        let size = 0;
        for (const desc of descriptors) {
            size += desc.bits;
        }
        size = (size + 7) >>> 3;
        const buffer = new Uint8Array(size);
        BitPacker.packIntoBuffer(descriptors, buffer);
        return buffer;
    }

    static packIntoBuffer(descriptors: Array<BitDescriptor>, buffer: Uint8Array): void {
        let index = 0;
        let bitIndex = 7;

        for (const desc of descriptors) {
            let value = desc.value;
            let bits = desc.bits;

            while (bits > 0 && index < buffer.byteLength) {
                const bitsToPack = bitIndex + 1;

                if (bits <= bitsToPack) {
                    const mask = (1 << bits) - 1

                    buffer[index] |= (value & mask) << (bitsToPack - bits);
                    bitIndex -= bits

                    if (bitIndex === -1) {
                        bitIndex = 7;
                        index++;
                    }
                    bits = 0;
                }
                else {
                    // `>>>` is an unsigned right logical shift
                    const mask = ((1 << bitsToPack) - 1) << (bits - bitsToPack);
                    buffer[index] |= (value & mask) >>> (bits - bitsToPack);

                    bitIndex = 7;
                    index++;
                    bits -= bitsToPack;
                }

            }
        }
    }
}
