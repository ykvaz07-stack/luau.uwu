import type { Chunk } from "../ast/types.js";
declare const ENCRYPTION_STRATEGIES: readonly ["xor", "add-rotate", "xor-chain", "sbox"];
type EncryptionStrategy = (typeof ENCRYPTION_STRATEGIES)[number];
export interface StringEncoderOptions {
    key?: number;
    enabled?: boolean;
    useFragmentation?: boolean;
    strategies?: EncryptionStrategy[];
    level?: number;
    crc8?: boolean;
}
export declare function encodeStrings(ast: Chunk, options?: StringEncoderOptions): Chunk;
export {};
//# sourceMappingURL=StringEncoder.d.ts.map