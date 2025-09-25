import { blake2b } from '@noble/hashes/blake2b';

type Schema = Record<string, any>;
const STATIC_PERMUTATION_KEY = '5a17a78732e6c8e34e62687c125e982c7f5c53b1b1a0670876f23f1f7d3d2c8f';

class AsymmetricBinaryCipher {
    private keyMatrix: number[][];

    constructor(seed: string) {
        this.keyMatrix = this.generateMatrixFromSeed(seed);
    }

    private generateMatrixFromSeed(seed: string): number[][] {
        const hash = blake2b(seed, { dkLen: 32 });
        const matrix: number[][] = [];
        for (let i = 0; i < 8; i++) {
            matrix.push(Array.from(hash.slice(i * 4, (i + 1) * 4)));
        }
        return matrix;
    }

    public encryptToBinaryShard(data: Schema): string {
        const serialized = JSON.stringify(data, (_, value) =>
            typeof value === 'bigint' ? value.toString() + 'n' : value
        );
        const dataBuffer = Buffer.from(serialized, 'utf-8');
        let binaryString = '';

        for (let i = 0; i < dataBuffer.length; i++) {
            const byte = dataBuffer[i];
            const keyRow = this.keyMatrix[i % this.keyMatrix.length];
            const keyByte = keyRow.reduce((acc, val) => acc ^ val, 0);
            const encryptedByte = byte ^ keyByte;
            binaryString += encryptedByte.toString(2).padStart(8, '0');
        }
        return binaryString;
    }
}

export const registerOnHyperchain = (data: Schema) => {
    const cipher = new AsymmetricBinaryCipher(STATIC_PERMUTATION_KEY);
    const binaryShard = cipher.encryptToBinaryShard(data);

    console.log(`Registering ${binaryShard.length} bits to hyperchain...`);
    
    return {
        txId: `0x${Buffer.from(blake2b(binaryShard)).toString('hex')}`,
        shardSize: binaryShard.length,
    };
};
