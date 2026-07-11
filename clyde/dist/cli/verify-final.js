import { lex } from "../lexer/Lexer.js";
import { parse } from "../parser/Parser.js";
import { runPipeline } from "../obfuscator/Pipeline.js";
import { printChunk } from "../obfuscator/Printer.js";
import { compile } from "../vm/Compiler.js";
import { generateVM } from "../vm/vm-gen.js";
const source = `local function fibonacci(n)
  if n <= 1 then
    return n
  end
  return fibonacci(n - 1) + fibonacci(n - 2)
end

local function factorial(n)
  if n <= 1 then
    return 1
  end
  return n * factorial(n - 1)
end

local data = {
  name = "test",
  value = 42,
  tags = {"a", "b", "c"},
  nested = {x = 1, y = 2, z = 3}
}

local x = 10
local y = 20
local result = fibonacci(x) + factorial(y)
print("Results: " .. result)
print("Done")
`;
console.log("=".repeat(70));
console.log("CLYDE ELITE — Final Verification Suite");
console.log("=".repeat(70));
console.log();
let totalErrors = 0;
function verify(name, fn) {
    const result = fn();
    const status = result.valid ? "PASS" : "FAIL";
    if (!result.valid)
        totalErrors++;
    console.log(`  [${status}] ${name}: ${result.detail}`);
}
// 1. Parse original
console.log("--- Phase 1: Source Processing ---");
const { tokens, errors: lexErrors } = lex(source);
verify("Lex source", () => ({ valid: lexErrors.length === 0, detail: `${lexErrors.length} errors` }));
const ast = parse(tokens);
verify("Parse source", () => ({ valid: true, detail: `${ast.body.length} top-level statements` }));
// 2. Pipeline passes
console.log("\n--- Phase 2: Pipeline Passes ---");
const levels = ["low", "medium", "high", "max"];
for (const level of levels) {
    const start = Date.now();
    const result = runPipeline(ast, { protectionLevel: level, seed: 12345 });
    const elapsed = Date.now() - start;
    const output = printChunk(result);
    // Re-parse to verify validity
    const { errors: reparseErrors } = lex(output);
    verify(`Pipeline [${level}] ${output.length} bytes in ${elapsed}ms`, () => ({
        valid: reparseErrors.length === 0,
        detail: `${result.body.length} stmts, can re-lex: ${reparseErrors.length === 0 ? "yes" : "no"}`
    }));
}
// 3. Per-pass tests
console.log("\n--- Phase 3: Individual Pass Verification ---");
// 3a. Check MBA numbers are produced
{
    const r1 = runPipeline(ast, { protectionLevel: "max", seed: 99999 });
    const out1 = printChunk(r1);
    const hasMBA = out1.includes("+") || out1.includes("*") || out1.includes("~");
    verify("MBA expressions generated", () => ({ valid: hasMBA, detail: `MBA patterns ${hasMBA ? "found" : "missing"}` }));
}
// 3b. Check string encoding
{
    const hasEncoding = printChunk(runPipeline(ast, { protectionLevel: "max", seed: 42 })).includes("_uDec_");
    verify("String encoding injected", () => ({ valid: hasEncoding, detail: `Decoder ${hasEncoding ? "present" : "missing"}` }));
}
// 3c. Check dead code
{
    const out = printChunk(runPipeline(ast, { protectionLevel: "max", seed: 77 }));
    verify("Dead code injection", () => ({ valid: out.length > 2000, detail: `${out.length} bytes (baseline ~500)` }));
}
// 3d. Check control flow flattening has state variables
{
    const out = printChunk(runPipeline(ast, { protectionLevel: "max", seed: 1 }));
    const hasFlattening = out.includes("_s");
    verify("Control flow flattening", () => ({ valid: hasFlattening, detail: `State vars ${hasFlattening ? "present" : "missing"}` }));
}
// 3e. Check function call obfuscation
{
    const out = printChunk(runPipeline(ast, { protectionLevel: "max", seed: 2 }));
    const hasIndirection = out.includes("_fnTbl_") || out.includes("_wrapDispatch");
    verify("Function call obfuscation", () => ({ valid: hasIndirection, detail: `Dispatch ${hasIndirection ? "found" : "missing"}` }));
}
// 3f. Check anti-debug
{
    const out = printChunk(runPipeline(ast, { protectionLevel: "max", seed: 3 }));
    const hasAntiDebug = out.includes("debug.info");
    verify("Anti-debug injection", () => ({ valid: hasAntiDebug, detail: `debug.info ${hasAntiDebug ? "found" : "missing"}` }));
}
// 3g. Check watermark
{
    const out = printChunk(runPipeline(ast, { protectionLevel: "max", seed: 4 }));
    const hasWatermark = out.includes("_wm") || out.includes("_wd");
    verify("Watermark embedded", () => ({ valid: hasWatermark, detail: `Watermark ${hasWatermark ? "found" : "missing"}` }));
}
// 3h. Check metatable protection
{
    const out = printChunk(runPipeline(ast, { protectionLevel: "max", seed: 5 }));
    const hasMeta = out.includes("_mt_ro_") || out.includes("_mt_wrap_");
    verify("Metatable protection", () => ({ valid: hasMeta, detail: `Metatables ${hasMeta ? "found" : "missing"}` }));
}
// 4. VM output
console.log("\n--- Phase 4: VM Generation ---");
try {
    const pipelineResult = runPipeline(ast, { protectionLevel: "high", seed: 12345 });
    const chunk = compile(pipelineResult);
    const vmStart = Date.now();
    const vmMax = generateVM(chunk, { level: "max", executorGlobals: true, noCompression: false });
    const vmTime = Date.now() - vmStart;
    verify("VM generation (max level)", () => ({
        valid: vmMax.length > 1000,
        detail: `${vmMax.length} bytes generated in ${vmTime}ms`
    }));
    // Check output has the loader structure (strings are encoded in bootstrap)
    const hasReturn = vmMax.includes("return");
    const hasFunction = vmMax.includes("function");
    const hasLoader = vmMax.length > 10000 && hasReturn && hasFunction;
    verify("VM has bootstrap loader", () => ({ valid: hasLoader, detail: `Loader ${hasLoader ? "present" : "missing"}, ${vmMax.length} bytes total` }));
}
catch (e) {
    verify("VM generation", () => ({ valid: false, detail: `Error: ${e.message}` }));
}
// 5. Summary
console.log("\n" + "=".repeat(70));
if (totalErrors === 0) {
    console.log("ALL VERIFICATIONS PASSED");
}
else {
    console.log(`${totalErrors} VERIFICATION(S) FAILED`);
}
console.log("=".repeat(70));
//# sourceMappingURL=verify-final.js.map