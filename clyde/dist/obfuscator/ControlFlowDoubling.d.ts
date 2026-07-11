import type { Chunk } from "../ast/types.js";
export interface ControlFlowDoublingOptions {
    enabled?: boolean;
    seed?: number;
}
export declare function applyControlFlowDoubling(ast: Chunk, options?: ControlFlowDoublingOptions): Chunk;
//# sourceMappingURL=ControlFlowDoubling.d.ts.map