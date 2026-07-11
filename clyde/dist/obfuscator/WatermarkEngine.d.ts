import type { Chunk } from "../ast/types.js";
export interface WatermarkEngineOptions {
    enabled?: boolean;
    watermark?: string;
    seed?: number;
}
export declare function embedWatermark(ast: Chunk, options?: WatermarkEngineOptions): Chunk;
//# sourceMappingURL=WatermarkEngine.d.ts.map