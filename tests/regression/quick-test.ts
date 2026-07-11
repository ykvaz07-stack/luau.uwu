#!/usr/bin/env node
/**
 * Quick Local Test Runner
 * Run with: npx tsx tests/regression/quick-test.ts
 */

import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = join(__dirname, "..", "..");
const CLYDE_ROOT = join(ROOT, "clyde");
const WORK_DIR = join(__dirname, "work");

if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

const LUAU_BIN = process.env.LUAU_BIN || "luau";

const TEST_SCRIPTS = [
  {
    name: "math",
    source: `
local sum = 0
for i = 1, 10000 do
  sum = sum + math.sin(i) * math.cos(i)
end
print("Math result: " .. sum)
`,
  },
  {
    name: "tables",
    source: `
local t = {}
for i = 1, 5000 do
  t[i] = {id = i, data = {1,2,3}}
end
local sum = 0
for i = 1, #t do
  sum = sum + t[i].id
  for j = 1, 3 do sum = sum + t[i].data[j] end
end
print("Table sum: " .. sum)
`,
  },
  {
    name: "strings",
    source: `
local s = ""
for i = 1, 5000 do s = s .. "test" end
local count = 0
for _ in string.gmatch(s, "test") do count = count + 1 end
print("String count: " .. count)
`,
  },
  {
    name: "closures",
    source: `
local function makeAdder(x)
  return function(y) return x + y end
end
local add5 = makeAdder(5)
local add10 = makeAdder(10)
print("5+3=" .. add5(3) .. " 10+7=" .. add10(7))
assert(add5(3) == 8 and add10(7) == 17)
`,
  },
];

const CONFIGS = [
  { level: "debug", vmType: "register", perfLevel: 1, target: "luau" },
  { level: "normal", vmType: "register", perfLevel: 2, target: "luau" },
  { level: "max", vmType: "register", perfLevel: 3, target: "luau" },
];

function runLuau(script: string): { stdout: string; exitCode: number } {
  const tempFile = join(WORK_DIR, `temp_${Date.now()}.lua`);
  writeFileSync(tempFile, script);
  try {
    const result = spawnSync("luau", [tempFile], { encoding: "utf-8", timeout: 5000 });
    return { stdout: result.stdout || "", exitCode: result.status ?? 0 };
  } finally {
    if (existsSync(tempFile)) rmSync(tempFile);
  }
}

function obfuscate(source: string, config: any): string {
  const inputFile = join(WORK_DIR, `in_${Date.now()}.lua`);
  const outputFile = join(WORK_DIR, `out_${Date.now()}.lua`);
  writeFileSync(inputFile, source);
  
  const args = [
    join(CLYDE_ROOT, "dist/cli/obfuscate.js"),
    "--input", inputFile,
    "--output", outputFile,
    "--level", config.level,
    "--vm-type", config.vmType,
    "--perf-level", String(config.perfLevel),
    "--target", config.target,
  ];
  
  const result = spawnSync("node", args, { cwd: ROOT, timeout: 30000, encoding: "utf-8" });
  if (result.status !== 0) throw new Error(`Obfuscation failed: ${result.stderr}`);
  
  const output = readFileSync(outputFile, "utf-8");
  if (existsSync(inputFile)) rmSync(inputFile);
  if (existsSync(outputFile)) rmSync(outputFile);
  return output;
}

console.log("=== Quick Local Regression Test ===\n");

let passed = 0, failed = 0;

for (const config of CONFIGS) {
  console.log(`\n=== Config: ${config.level}/${config.vmType}/perf${config.perfLevel} ===`);
  
  for (const test of TEST_SCRIPTS) {
    process.stdout.write(`  ${test.name}... `);
    
    try {
      // Test original
      const orig = runLuau(test.source);
      if (orig.exitCode !== 0) throw new Error(`Original failed: ${orig.stdout}`);
      
      // Obfuscate and test
      const obf = obfuscate(test.source, config);
      const obfResult = runLuau(obf);
      if (obfResult.exitCode !== 0) throw new Error(`Obfuscated failed: ${obfResult.stdout}`);
      
      console.log("✓");
      passed++;
    } catch (e: any) {
      console.log("✗");
      console.log(`    ${e.message}`);
      failed++;
    }
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);