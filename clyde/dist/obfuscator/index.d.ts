export { obfuscate, type ObfuscatorOptions } from "./Obfuscator.js";
export { encodeStrings, type StringEncoderOptions } from "./StringEncoder.js";
export { scrambleControlFlow, type ControlFlowScramblerOptions } from "./ControlFlowScrambler.js";
export { printChunk, printExpression } from "./Printer.js";
export { obfuscateNumbers, type NumberObfuscatorOptions } from "./NumberObfuscator.js";
export { flattenControlFlow, type ControlFlowFlattenerOptions } from "./ControlFlowFlattener.js";
export { injectDeadCodePass, type DeadCodeInjectorOptions } from "./DeadCodeInjector.js";
export { obfuscateFunctionCalls, type FunctionCallObfuscatorOptions } from "./FunctionCallObfuscator.js";
export { scrambleTableFields, type TableFieldScramblerOptions } from "./TableFieldScrambler.js";
export { protectWithMetatables, type MetatableProtectorOptions } from "./MetatableProtector.js";
export { injectAntiDebug, type AntiDebugInjectorOptions } from "./AntiDebugInjector.js";
export { embedWatermark, type WatermarkEngineOptions } from "./WatermarkEngine.js";
export { MBAEngine, type MBAConfig } from "./MBAExpressionEngine.js";
export { runPipeline, runPipelineWithPhantomVM, type PipelineOptions, type ProtectionLevel } from "./Pipeline.js";
export { compilePhantom } from "../vm/phantom-compiler.js";
export { generatePhantomVM, type PhantomGenOptions } from "../vm/phantom-vm-gen.js";
//# sourceMappingURL=index.d.ts.map