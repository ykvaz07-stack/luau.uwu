import type { Chunk } from "../ast/types.js";
export interface FunctionCallObfuscatorOptions {
    enabled?: boolean;
    seed?: number;
    intensity?: number;
}
export declare function obfuscateFunctionCalls(ast: Chunk, options?: FunctionCallObfuscatorOptions): Chunk;
//# sourceMappingURL=FunctionCallObfuscator.d.ts.map