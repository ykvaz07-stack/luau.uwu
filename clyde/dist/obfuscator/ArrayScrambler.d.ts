import type { Chunk } from "../ast/types.js";
export interface ArrayScramblerOptions {
    enabled?: boolean;
    seed?: number;
    minFields?: number;
}
export declare function scrambleArrays(ast: Chunk, options?: ArrayScramblerOptions): Chunk;
//# sourceMappingURL=ArrayScrambler.d.ts.map