import type { Chunk } from "../ast/types.js";
export interface DeadCodeInjectorOptions {
    enabled?: boolean;
    density?: number;
    seed?: number;
}
export declare function injectDeadCodePass(ast: Chunk, options?: DeadCodeInjectorOptions): Chunk;
//# sourceMappingURL=DeadCodeInjector.d.ts.map