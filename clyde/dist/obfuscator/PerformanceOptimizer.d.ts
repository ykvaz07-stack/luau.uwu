import type { Chunk } from "../ast/types.js";
export interface PerformanceOptimizerOptions {
    enabled?: boolean;
    seed?: number;
    constantFolding?: boolean;
    deadStoreElimination?: boolean;
    strengthReduction?: boolean;
    gcOptimizations?: boolean;
    level?: 1 | 2 | 3;
}
export declare function optimizePerformance(ast: Chunk, options?: PerformanceOptimizerOptions): Chunk;
//# sourceMappingURL=PerformanceOptimizer.d.ts.map