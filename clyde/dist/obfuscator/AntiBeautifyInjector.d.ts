import type { Chunk } from "../ast/types.js";
export interface AntiBeautifyInjectorOptions {
    enabled?: boolean;
    seed?: number;
    intensity?: number;
}
export declare function injectAntiBeautify(ast: Chunk, options?: AntiBeautifyInjectorOptions): Chunk;
//# sourceMappingURL=AntiBeautifyInjector.d.ts.map