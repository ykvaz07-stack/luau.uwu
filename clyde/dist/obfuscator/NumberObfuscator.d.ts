import type { Chunk } from "../ast/types.js";
export interface NumberObfuscatorOptions {
    enabled?: boolean;
    seed?: number;
    useBitops?: boolean;
}
export declare function obfuscateNumbers(ast: Chunk, options?: NumberObfuscatorOptions): Chunk;
//# sourceMappingURL=NumberObfuscator.d.ts.map