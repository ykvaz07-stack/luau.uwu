import type { Chunk } from "../ast/types.js";
import { obfuscate, type ObfuscatorOptions } from "./Obfuscator.js";
import { encodeStrings, type StringEncoderOptions } from "./StringEncoder.js";
import { scrambleControlFlow, type ControlFlowScramblerOptions } from "./ControlFlowScrambler.js";
import { obfuscateNumbers, type NumberObfuscatorOptions } from "./NumberObfuscator.js";
import { flattenControlFlow, type ControlFlowFlattenerOptions } from "./ControlFlowFlattener.js";
import { injectDeadCodePass, type DeadCodeInjectorOptions } from "./DeadCodeInjector.js";
import { obfuscateFunctionCalls, type FunctionCallObfuscatorOptions } from "./FunctionCallObfuscator.js";
import { scrambleTableFields, type TableFieldScramblerOptions } from "./TableFieldScrambler.js";
import { protectWithMetatables, type MetatableProtectorOptions } from "./MetatableProtector.js";
import { injectAntiDebug, type AntiDebugInjectorOptions } from "./AntiDebugInjector.js";
import { embedWatermark, type WatermarkEngineOptions } from "./WatermarkEngine.js";
import { applyControlFlowDoubling, type ControlFlowDoublingOptions } from "./ControlFlowDoubling.js";
import { scrambleArrays, type ArrayScramblerOptions } from "./ArrayScrambler.js";
import { compilePhantom } from "../vm/phantom-compiler.js";
import { generatePhantomVM } from "../vm/phantom-vm-gen.js";
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

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shufflePasses<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type PassFunction = (ast: Chunk, opts?: any) => Chunk;

interface RegisteredPass {
  name: string;
  fn: PassFunction;
  options: any;
}

function getPassesForLevel(level: ProtectionLevel, baseSeed: number): RegisteredPass[] {
  const passes: RegisteredPass[] = [];

  const renameOpts: ObfuscatorOptions = { seed: baseSeed };
  const stringOpts: StringEncoderOptions = { key: baseSeed };
  const numberOpts: NumberObfuscatorOptions = { seed: baseSeed + 1 };
  const controlScrambleOpts: ControlFlowScramblerOptions = { seed: baseSeed + 2 };

  passes.push({ name: "renameLocals", fn: obfuscate, options: renameOpts });
  passes.push({ name: "encodeStrings", fn: encodeStrings, options: stringOpts });

  if (level === "low") return passes;

  passes.push({ name: "obfuscateNumbers", fn: obfuscateNumbers, options: numberOpts });
  passes.push({ name: "scrambleControlFlow", fn: scrambleControlFlow, options: controlScrambleOpts });
  passes.push({ name: "scrambleTableFields", fn: scrambleTableFields, options: { seed: baseSeed + 3 } });
  passes.push({ name: "deadCode", fn: injectDeadCodePass, options: { seed: baseSeed + 4, density: 0.1 } });
  passes.push({ name: "antiDebug", fn: injectAntiDebug, options: { seed: baseSeed + 5, intensity: 0.3 } });

  if (level === "medium") return passes;

  passes.push({ name: "flattenControlFlow", fn: flattenControlFlow, options: { seed: baseSeed + 6 } });
  passes.push({ name: "functionCallObfuscation", fn: obfuscateFunctionCalls, options: { seed: baseSeed + 7, intensity: 0.5 } });
  passes.push({ name: "deadCode", fn: injectDeadCodePass, options: { seed: baseSeed + 8, density: 0.2 } });
  passes.push({ name: "watermark", fn: embedWatermark, options: { seed: baseSeed + 9 } });

  if (level === "high") return passes;

  passes.push({ name: "metatableProtection", fn: protectWithMetatables, options: { seed: baseSeed + 10 } });
  passes.push({ name: "deadCode", fn: injectDeadCodePass, options: { seed: baseSeed + 11, density: 0.3 } });
  passes.push({ name: "antiDebug", fn: injectAntiDebug, options: { seed: baseSeed + 12, intensity: 0.7 } });
  passes.push({ name: "functionCallObfuscation", fn: obfuscateFunctionCalls, options: { seed: baseSeed + 13, intensity: 0.8 } });
  passes.push({ name: "obfuscateNumbers", fn: obfuscateNumbers, options: { seed: baseSeed + 14, useBitops: true } });
  passes.push({ name: "controlFlowDoubling", fn: applyControlFlowDoubling, options: { seed: baseSeed + 15 } });
  passes.push({ name: "scrambleArrays", fn: scrambleArrays, options: { seed: baseSeed + 16, minFields: 4 } });

  return passes;
}

export function runPipeline(ast: Chunk, options: PipelineOptions = {}): Chunk {
  const level = options.protectionLevel ?? "max";
  const seed = options.seed ?? Math.floor(Math.random() * 0x7fffffff);
  const rng = createRng(seed);

  const customPasses: RegisteredPass[] = [];

  if (options.renameLocals !== undefined) customPasses.push({ name: "renameLocals", fn: obfuscate, options: options.renameLocals });
  if (options.encodeStrings !== undefined) customPasses.push({ name: "encodeStrings", fn: encodeStrings, options: options.encodeStrings });
  if (options.scrambleControlFlow !== undefined) customPasses.push({ name: "scrambleControlFlow", fn: scrambleControlFlow, options: options.scrambleControlFlow });
  if (options.obfuscateNumbers !== undefined) customPasses.push({ name: "obfuscateNumbers", fn: obfuscateNumbers, options: options.obfuscateNumbers });
  if (options.flattenControlFlow !== undefined) customPasses.push({ name: "flattenControlFlow", fn: flattenControlFlow, options: options.flattenControlFlow });
  if (options.deadCode !== undefined) customPasses.push({ name: "deadCode", fn: injectDeadCodePass, options: options.deadCode });
  if (options.functionCallObfuscation !== undefined) customPasses.push({ name: "functionCallObfuscation", fn: obfuscateFunctionCalls, options: options.functionCallObfuscation });
  if (options.tableScrambling !== undefined) customPasses.push({ name: "tableScrambling", fn: scrambleTableFields, options: options.tableScrambling });
  if (options.metatableProtection !== undefined) customPasses.push({ name: "metatableProtection", fn: protectWithMetatables, options: options.metatableProtection });
  if (options.antiDebug !== undefined) customPasses.push({ name: "antiDebug", fn: injectAntiDebug, options: options.antiDebug });
  if (options.watermark !== undefined) customPasses.push({ name: "watermark", fn: embedWatermark, options: options.watermark });
  if (options.controlFlowDoubling !== undefined) customPasses.push({ name: "controlFlowDoubling", fn: applyControlFlowDoubling, options: options.controlFlowDoubling });
  if (options.scrambleArrays !== undefined) customPasses.push({ name: "scrambleArrays", fn: scrambleArrays, options: options.scrambleArrays });

  let passes: RegisteredPass[];
  if (customPasses.length > 0) {
    passes = customPasses;
  } else {
    passes = getPassesForLevel(level, seed);
  }

  const shuffled = shufflePasses(passes, rng);

  const renamePass = passes.find(p => p.name === "renameLocals");
  const otherPasses = passes.filter(p => p.name !== "renameLocals");

  const orderedPasses = renamePass ? [renamePass, ...otherPasses] : otherPasses;

  let result = ast;
  for (const pass of orderedPasses) {
    try {
      result = pass.fn(result, pass.options);
    } catch (e) {
      console.warn(`Pass '${pass.name}' failed:`, e);
    }
  }

  return result;
}

export function runPipelineWithPhantomVM(ast: Chunk, options: PipelineOptions = {}): string {
  const result = runPipeline(ast, options);
  const chunk = compilePhantom(result);
  const vmOptions = options.phantomVM ?? { level: "max", seed: options.seed };
  return generatePhantomVM(chunk, vmOptions);
}
