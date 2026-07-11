import type { Chunk } from "../ast/types.js";
export interface AntiDebugInjectorOptions {
    enabled?: boolean;
    seed?: number;
    intensity?: number;
    useDebugLibrary?: boolean;
    hookCheck?: boolean;
    callDepthCheck?: boolean;
    stackFrameCheck?: boolean;
    environmentLock?: boolean;
    crashOnDetection?: boolean;
}
export declare function injectAntiDebug(ast: Chunk, options?: AntiDebugInjectorOptions): Chunk;
//# sourceMappingURL=AntiDebugInjector.d.ts.map