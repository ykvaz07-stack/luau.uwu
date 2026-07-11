#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { lex } from "../lexer/Lexer.js";
import { parse } from "../parser/Parser.js";
import { obfuscate } from "../obfuscator/Obfuscator.js";
import { encodeStrings } from "../obfuscator/StringEncoder.js";
import { scrambleControlFlow } from "../obfuscator/ControlFlowScrambler.js";
import { injectDeadCodePass } from "../obfuscator/DeadCodeInjector.js";
import { runPipeline } from "../obfuscator/Pipeline.js";
import { printChunk } from "../obfuscator/Printer.js";
import { optimizePerformance } from "../obfuscator/PerformanceOptimizer.js";
import { processMacros } from "../obfuscator/MacroProcessor.js";
import { compile } from "../vm/Compiler.js";
import { generateVM } from "../vm/vm-gen.js";
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
    console.log(`uwu.dll obfuscator - usage:
  node obfuscate.js [options] <file.lua>

Obfuscation levels (no vm):
  --scramble          Control flow scrambling + rename locals
  --advanced          High level (all passes, no VM)
  --production        Same as --advanced
  --max               Max level (all passes, no VM)
  --elite             Same as --max

VM virtualization:
  --vm                Enable VM virtualization (compile to custom bytecode)
  --vm-layers <1-3>   VM nesting depth (1=single, 2=dual, 3=triple)
  --triple            Shortcut for --vm-layers 3
  --vm-debug          Debug mode (no VM encryption)
  --vm-level <level>  debug | normal | max

Pipeline passes:
  --encode-strings    Encode string literals
  --no-encode         Skip string encoding
  --no-rename         Skip variable renaming
  --junk              Inject dead code
  --optimize          Apply constant folding + strength reduction
  --enc-func          Honor --@enc-func markers in source
  --no-vm-markers     Honor --@no-vm markers in source

Output:
  -o <file>           Write to file instead of stdout
  --minify            Minify output (no VM only)
  --one-line          One-line output (no VM only)
  --unicode           Use unicode confusable variable names

Other:
  --seed <n>          RNG seed for reproducible output
  --target <ver>      luau (default) | lua51 | lua52
  --no-compress       Disable VM blob compression
  --no-preserve       Don't preserve global identifiers
`);
    process.exit(0);
}
const noRename = args.includes("--no-rename");
const noPreserve = args.includes("--no-preserve");
const encodeStringsOpt = args.includes("--encode-strings");
const noEncode = args.includes("--no-encode");
const scrambleOpt = args.includes("--scramble");
const vmOpt = args.includes("--vm");
const junkOpt = args.includes("--junk");
const oneLineOpt = args.includes("--one-line");
const minifyOpt = args.includes("--minify");
const productionOpt = args.includes("--production");
const advancedOpt = args.includes("--advanced");
const maxOpt = args.includes("--max");
const tripleOpt = args.includes("--triple");
const eliteOpt = args.includes("--elite");
const compressOpt = args.includes("--compress");
const noCompressOpt = args.includes("--no-compress");
const unicodeOpt = args.includes("--unicode");
const optimizeOpt = args.includes("--optimize");
const noVMMarkersOpt = args.includes("--no-vm-markers");
const encFuncOpt = args.includes("--enc-func");
const targetIndex = args.findIndex((a) => a === "--target");
const targetVersion = targetIndex >= 0 ? args[targetIndex + 1] : "luau";
const seedArg = args.findIndex((a) => a === "--seed");
const seed = seedArg >= 0 ? parseInt(args[seedArg + 1], 10) : undefined;
const outIndex = args.findIndex((a) => a === "-o" || a === "--output");
const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
const layersIndex = args.findIndex((a) => a === "--vm-layers");
const layers = layersIndex >= 0 ? parseInt(args[layersIndex + 1], 10) : undefined;
const skipIndices = new Set();
if (seedArg >= 0)
    skipIndices.add(seedArg + 1);
if (targetIndex >= 0)
    skipIndices.add(targetIndex + 1);
if (outIndex >= 0)
    skipIndices.add(outIndex + 1);
if (layersIndex >= 0)
    skipIndices.add(layersIndex + 1);
const fileArgs = args.filter((a, i) => !a.startsWith("-") && !skipIndices.has(i));
const file = fileArgs[0];
const source = file
    ? readFileSync(file, "utf-8")
    : `local x = 42
local name = "World"
print("Hello " .. name)
function foo(a, b)
  return a + b
end
`;
const annotations = processMacros(source, { enabled: noVMMarkersOpt || encFuncOpt });
const { tokens, errors } = lex(source);
if (errors.length > 0) {
    console.error("Lexer errors:", errors);
    process.exit(1);
}
let ast = parse(tokens);
if (optimizeOpt) {
    ast = optimizePerformance(ast, { level: 3, seed });
}
let protectionLevel = "low";
if (eliteOpt || maxOpt)
    protectionLevel = "max";
else if (advancedOpt || productionOpt)
    protectionLevel = "high";
else if (scrambleOpt || junkOpt)
    protectionLevel = "medium";
const vmGenOptions = {};
if (targetVersion === "luau") {
    vmGenOptions.executorGlobals = true;
}
else if (targetVersion === "lua51" || targetVersion === "lua52") {
    vmGenOptions.executorGlobals = false;
    vmGenOptions.targetVersion = targetVersion;
}
let output;
if (vmOpt) {
    const pipelineResult = runPipeline(ast, {
        protectionLevel,
        seed,
        renameLocals: noRename ? { renameLocals: false } : undefined,
        encodeStrings: noEncode ? { enabled: false } : undefined,
    });
    const chunk = compile(pipelineResult);
    const vmDebug = args.includes("--vm-debug");
    let level = "normal";
    if (vmDebug || args.includes("--no-vm-encode"))
        level = "debug";
    if (maxOpt || advancedOpt || productionOpt || eliteOpt)
        level = "max";
    let nesting = 0;
    if (layers !== undefined) {
        nesting = Math.max(0, Math.min(2, layers - 1));
    }
    else if (tripleOpt) {
        nesting = 2;
    }
    else if (maxOpt || eliteOpt) {
        nesting = 1;
    }
    const splitTraces = maxOpt || eliteOpt;
    output = generateVM(chunk, {
        level,
        executorGlobals: level !== "debug",
        noCompression: noCompressOpt,
        nesting,
        splitTraces,
        ...vmGenOptions,
    });
}
else {
    if (eliteOpt) {
        ast = runPipeline(ast, { protectionLevel: "max", seed, renameLocals: noRename ? { renameLocals: false } : undefined });
    }
    else if (advancedOpt || productionOpt) {
        ast = runPipeline(ast, { protectionLevel: "high", seed });
    }
    else if (scrambleOpt || encodeStringsOpt || junkOpt) {
        if (encodeStringsOpt && !noEncode)
            ast = encodeStrings(ast, { enabled: true });
        if (scrambleOpt)
            ast = scrambleControlFlow(ast, { enabled: true });
        if (junkOpt)
            ast = injectDeadCodePass(ast, { enabled: true });
        ast = obfuscate(ast, { renameLocals: !noRename, preserveGlobals: !noPreserve, useUnicodeNames: unicodeOpt });
    }
    else {
        ast = obfuscate(ast, { renameLocals: !noRename, preserveGlobals: !noPreserve, useUnicodeNames: unicodeOpt });
    }
    output = minifyOpt ? printChunk(ast, true) : printChunk(ast);
}
if (outFile) {
    writeFileSync(outFile, output, "utf-8");
    console.error(`Obfuscated to ${outFile}`);
}
else {
    console.log(output);
}
//# sourceMappingURL=obfuscate.js.map