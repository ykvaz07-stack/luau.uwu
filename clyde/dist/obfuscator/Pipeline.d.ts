import type { Chunk } from "../ast/types.js";
import { type ObfuscatorOptions } from "./Obfuscator.js";
import { type StringEncoderOptions } from "./StringEncoder.js";
import { type ControlFlowScramblerOptions } from "./ControlFlowScrambler.js";
import { type NumberObfuscatorOptions } from "./NumberObfuscator.js";
import { type ControlFlowFlattenerOptions } from "./ControlFlowFlattener.js";
import { type DeadCodeInjectorOptions } from "./DeadCodeInjector.js";
import { type FunctionCallObfuscatorOptions } from "./FunctionCallObfuscator.js";
import { type TableFieldScramblerOptions } from "./TableFieldScrambler.js";
import { type MetatableProtectorOptions } from "./MetatableProtector.js";
import { type AntiDebugInjectorOptions } from "./AntiDebugInjector.js";
import { type WatermarkEngineOptions } from "./WatermarkEngine.js";
export type ProtectionLevel = "low" | "medium" | "high" | "max";
export interface PipelineOptions {
    renameLocals?: ObfuscatorOptions;
    encodeStrings?: StringEncoderOptions;
    scrambleControlFlow?: ControlFlowScramblerOptions;
    obfuscateNumbers?: NumberObfuscatorOptions;
    flattenControlFlow?: ControlFlowFlattenerOptions;
    deadCode?: DeadCodeInjectorOptions;
    functionCallObfuscation?: FunctionCallObfuscatorOptions;
    tableScrambling?: TableFieldScramblerOptions;
    metatableProtection?: MetatableProtectorOptions;
    antiDebug?: AntiDebugInjectorOptions;
    watermark?: WatermarkEngineOptions;
    protectionLevel?: ProtectionLevel;
    seed?: number;
}
export declare function runPipeline(ast: Chunk, options?: PipelineOptions): Chunk;
//# sourceMappingURL=Pipeline.d.ts.map