import { lex } from "../lexer/Lexer.js";
import { parse } from "../parser/Parser.js";
import { obfuscate } from "../obfuscator/Obfuscator.js";
import { encodeStrings } from "../obfuscator/StringEncoder.js";
import { scrambleControlFlow } from "../obfuscator/ControlFlowScrambler.js";
import { obfuscateNumbers } from "../obfuscator/NumberObfuscator.js";
import { flattenControlFlow } from "../obfuscator/ControlFlowFlattener.js";
import { injectDeadCodePass } from "../obfuscator/DeadCodeInjector.js";
import { obfuscateFunctionCalls } from "../obfuscator/FunctionCallObfuscator.js";
import { scrambleTableFields } from "../obfuscator/TableFieldScrambler.js";
import { injectAntiDebug } from "../obfuscator/AntiDebugInjector.js";
import { embedWatermark } from "../obfuscator/WatermarkEngine.js";
import { protectWithMetatables } from "../obfuscator/MetatableProtector.js";
import { runPipeline } from "../obfuscator/Pipeline.js";
import { printChunk } from "../obfuscator/Printer.js";

const TEST_CODE = `local function greet(name)
  local msg = "Hello, " .. name
  print(msg)
  return #msg
end

local playerData = {
  name = "Player1",
  score = 100,
  items = {"sword", "shield", "potion"},
  active = true
}

local function calculateScore(base, multiplier)
  local result = base * multiplier
  if result > 1000 then
    result = 1000
  end
  return result
end

local x = 42
local y = 7 * x + 3
print("Final score: " .. calculateScore(x, y))
greet("Alice")`;

function runTest(name: string, fn: () => string): boolean {
  try {
    const output = fn();
    const lines = output.split("\n").filter(l => l.trim().length > 0);
    console.log(`\n=== ${name} ===`);
    console.log(`Output lines: ${lines.length}, Total chars: ${output.length}`);
    console.log(output.substring(0, 500) + (output.length > 500 ? "\n..." : ""));
    return true;
  } catch (e) {
    console.error(`FAILED: ${name}:`, e);
    return false;
  }
}

const { tokens } = lex(TEST_CODE);
const ast = parse(tokens);

let passed = 0;
let failed = 0;

function check(name: string, fn: () => string) {
  if (runTest(name, fn)) passed++;
  else failed++;
}

check("1. Variable Renaming", () => {
  return printChunk(obfuscate(ast, { renameLocals: true, preserveGlobals: true, seed: 42 }));
});

check("2. String Encoding (multi-key)", () => {
  return printChunk(encodeStrings(ast, { enabled: true, key: 0x5A }));
});

check("3. Control Flow Scrambling (dynamic predicates)", () => {
  return printChunk(scrambleControlFlow(ast, { enabled: true, seed: 42 }));
});

check("4. Number Obfuscation (MBA)", () => {
  return printChunk(obfuscateNumbers(ast, { enabled: true, seed: 42 }));
});

check("5. Control Flow Flattening", () => {
  return printChunk(flattenControlFlow(ast, { enabled: true, seed: 42 }));
});

check("6. Dead Code Injection", () => {
  return printChunk(injectDeadCodePass(ast, { enabled: true, seed: 42, density: 0.5 }));
});

check("7. Function Call Obfuscation", () => {
  return printChunk(obfuscateFunctionCalls(ast, { enabled: true, seed: 42, intensity: 1.0 }));
});

check("8. Table Field Scrambling", () => {
  return printChunk(scrambleTableFields(ast, { enabled: true, seed: 42 }));
});

check("9. Anti-Debug Injection", () => {
  return printChunk(injectAntiDebug(ast, { enabled: true, seed: 42 }));
});

check("10. Watermark Embedding", () => {
  return printChunk(embedWatermark(ast, { enabled: true, watermark: "ClydeElite" }));
});

check("11. Metatable Protection", () => {
  return printChunk(protectWithMetatables(ast, { enabled: true }));
});

check("12. FULL PIPELINE (MAX level)", () => {
  const result = runPipeline(ast, { protectionLevel: "max", seed: 12345 });
  return printChunk(result);
});

check("13. FULL PIPELINE (MAX level) - Minified", () => {
  const result = runPipeline(ast, { protectionLevel: "max", seed: 12345 });
  return printChunk(result, true);
});

console.log(`\n\n========== RESULTS ==========`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);

if (failed > 0) process.exit(1);
