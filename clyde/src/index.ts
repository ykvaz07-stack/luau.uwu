export { lex, Lexer, type LexResult } from "./lexer/Lexer.js";
export { parse, parseWithErrors, Parser, type ParseResult } from "./parser/Parser.js";
export {
  obfuscate, printChunk, printExpression,
  encodeStrings, scrambleControlFlow,
  obfuscateNumbers, flattenControlFlow,
  injectDeadCodePass, obfuscateFunctionCalls,
  scrambleTableFields, protectWithMetatables,
  injectAntiDebug, embedWatermark,
  MBAEngine, runPipeline,
  type ObfuscatorOptions, type StringEncoderOptions,
  type ControlFlowScramblerOptions, type NumberObfuscatorOptions,
  type ControlFlowFlattenerOptions, type DeadCodeInjectorOptions,
  type FunctionCallObfuscatorOptions, type TableFieldScramblerOptions,
  type MetatableProtectorOptions, type AntiDebugInjectorOptions,
  type WatermarkEngineOptions, type PipelineOptions, type ProtectionLevel,
  type MBAConfig,
} from "./obfuscator/index.js";
export type { Token, SourceLocation } from "./tokens.js";
export type { Chunk, Statement, Expression } from "./ast/types.js";
export { compile } from "./vm/Compiler.js";
export type { BytecodeChunk, Constant } from "./vm/bytecode.js";
export { generateVM, type VMGenOptions, type VMGenLevel } from "./vm/vm-gen.js";
export { compilePhantom, generatePhantomVM, runPipelineWithPhantomVM } from "./obfuscator/index.js";
export { validate, type ValidationResult, type ValidationError } from "./compiler/LuauCompiler.js";

