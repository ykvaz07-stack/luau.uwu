import type { Chunk } from "../ast/types.js";
export interface ControlFlowFlattenerOptions {
    enabled?: boolean;
    seed?: number;
    opaquePredicates?: boolean;
}
export declare function flattenControlFlow(ast: Chunk, options?: ControlFlowFlattenerOptions): Chunk;
//# sourceMappingURL=ControlFlowFlattener.d.ts.map