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
import { compile } from "../vm/Compiler.js";
import { generateVM } from "../vm/vm-gen.js";
const args = process.argv.slice(2);
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
const seedArg = args.findIndex((a) => a === "--seed");
const seed = seedArg >= 0 ? parseInt(args[seedArg + 1], 10) : undefined;
const outIndex = args.findIndex((a) => a === "-o" || a === "--output");
const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
const fileArgs = args.filter((a, i) => !a.startsWith("-") && (outIndex < 0 || i < outIndex || i > outIndex + 1));
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
const { tokens, errors } = lex(source);
if (errors.length > 0) {
    console.error("Lexer-Fehler:", errors);
    process.exit(1);
}
let ast = parse(tokens);
let protectionLevel = "low";
if (eliteOpt || maxOpt)
    protectionLevel = "max";
else if (advancedOpt || productionOpt)
    protectionLevel = "high";
else if (scrambleOpt || junkOpt)
    protectionLevel = "medium";
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
    const nesting = tripleOpt ? 2 : 0;
    const splitTraces = maxOpt || eliteOpt;
    output = generateVM(chunk, { level, executorGlobals: level !== "debug", noCompression: noCompressOpt, nesting, splitTraces });
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
    console.error(`Obfuskiert nach ${outFile}`);
}
else {
    console.log(output);
}
//# sourceMappingURL=obfuscate.js.map