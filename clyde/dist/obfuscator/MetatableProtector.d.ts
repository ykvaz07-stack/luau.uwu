import type { Chunk } from "../ast/types.js";
export interface MetatableProtectorOptions {
    enabled?: boolean;
    seed?: number;
    protectGlobals?: boolean;
}
export declare function protectWithMetatables(ast: Chunk, options?: MetatableProtectorOptions): Chunk;
//# sourceMappingURL=MetatableProtector.d.ts.map