import type { Chunk } from "../ast/types.js";
export interface TableFieldScramblerOptions {
    enabled?: boolean;
    seed?: number;
    addFakeFields?: boolean;
}
export declare function scrambleTableFields(ast: Chunk, options?: TableFieldScramblerOptions): Chunk;
//# sourceMappingURL=TableFieldScrambler.d.ts.map