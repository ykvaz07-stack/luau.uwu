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
import { type ControlFlowDoublingOptions } from "./ControlFlowDoubling.js";
import { type ArrayScramblerOptions } from "./ArrayScrambler.js";
import type { PhantomGenOptions } from "../vm/phantom-vm-gen.js";
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
    controlFlowDoubling?: ControlFlowDoublingOptions;
    scrambleArrays?: ArrayScramblerOptions;
    phantomVM?: PhantomGenOptions;
    protectionLevel?: ProtectionLevel;
    seed?: number;
}
export declare function runPipeline(ast: Chunk, options?: PipelineOptions): Chunk;
export declare function runPipelineWithPhantomVM(ast: Chunk, options?: PipelineOptions): string;
//# sourceMappingURL=Pipeline.d.ts.map