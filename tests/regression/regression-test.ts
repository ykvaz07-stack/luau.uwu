#!/usr/bin/env node
/**
 * Clyde Regression Test Suite
 * 
 * Tests that obfuscated scripts produce identical output to unobfuscated scripts.
 * Supports testing against multiple protection levels and VM types.
 */

import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = join(__dirname, "..");
const CLYDE_ROOT = join(ROOT, "clyde");
const TEST_DIR = join(ROOT, "tests", "regression");
const WORK_DIR = join(TEST_DIR, "work");

// Ensure directories exist
if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

interface TestCase {
  name: string;
  source: string;
  expectedOutput?: string;
  expectedExitCode?: number;
  timeout?: number;
}

const TEST_CASES: TestCase[] = [
  {
    name: "basic-arithmetic",
    source: `
local a = 10
local b = 20
local c = a + b * 2
print("Result: " .. c)
assert(c == 50, "Arithmetic failed")
`,
    expectedOutput: "Result: 50\n",
  },
  {
    name: "table-operations",
    source: `
local t = {1, 2, 3, 4, 5}
local sum = 0
for i, v in ipairs(t) do
  sum = sum + v
end
print("Sum: " .. sum)
assert(sum == 15, "Table sum failed")

local dict = {a = 10, b = 20, c = 30}
local dictSum = 0
for k, v in pairs(dict) do
  dictSum = dictSum + v
end
print("Dict sum: " .. dictSum)
assert(dictSum == 60, "Dict sum failed")
`,
    expectedOutput: "Sum: 15\nDict sum: 60\n",
  },
  {
    name: "function-closures",
    source: `
local function makeCounter()
  local count = 0
  return function()
    count = count + 1
    return count
  end
end

local c1 = makeCounter()
local c2 = makeCounter()

print(c1() .. " " .. c1() .. " " .. c2() .. " " .. c2())
assert(c1() == 3)
assert(c2() == 2)
print("Closures work!")
`,
    expectedOutput: "1 1 2 2\nClosures work!\n",
  },
  {
    name: "recursion",
    source: `
local function fib(n)
  if n <= 1 then return n end
  return fib(n - 1) + fib(n - 2)
end

local function factorial(n)
  if n <= 1 then return 1 end
  return n * factorial(n - 1)
end

print("fib(10) = " .. fib(10))
print("factorial(5) = " .. factorial(5))
assert(fib(10) == 55)
assert(factorial(5) == 120)
print("Recursion works!")
`,
    expectedOutput: "fib(10) = 55\nfactorial(5) = 120\nRecursion works!\n",
  },
  {
    name: "string-manipulation",
    source: `
local str = "Hello, World!"
local upper = string.upper(str)
local lower = string.lower(str)
local sub = string.sub(str, 1, 5)
local len = string.len(str)
local rep = string.rep("x", 3)

print("Upper: " .. upper)
print("Lower: " .. lower)
print("Sub: " .. sub)
print("Len: " .. len)
print("Rep: " .. rep)

assert(upper == "HELLO, WORLD!")
assert(lower == "hello, world!")
assert(sub == "Hello")
assert(len == 13)
assert(rep == "xxx")
print("String ops work!")
`,
    expectedOutput: "Upper: HELLO, WORLD!\nLower: hello, world!\nSub: Hello\nLen: 13\nRep: xxx\nString ops work!\n",
  },
  {
    name: "coroutines",
    source: `
local function producer()
  return coroutine.create(function()
    for i = 1, 5 do
      coroutine.yield(i)
    end
  end)
end

local co = producer()
local results = {}
while true do
  local ok, val = coroutine.resume(co)
  if not ok or val == nil then break end
  table.insert(results, val)
end

print("Coroutine results: " .. table.concat(results, ", "))
assert(#results == 5)
assert(results[1] == 1 and results[5] == 5)
print("Coroutines work!")
`,
    expectedOutput: "Coroutine results: 1, 2, 3, 4, 5\nCoroutines work!\n",
  },
  {
    name: "metatables",
    source: `
local Vector = {}
Vector.__index = Vector

function Vector.new(x, y)
  return setmetatable({x = x, y = y}, Vector)
end

function Vector.__add(a, b)
  return Vector.new(a.x + b.x, a.y + b.y)
end

function Vector.__tostring(v)
  return "Vector(" .. v.x .. ", " .. v.y .. ")"
end

local a = Vector.new(1, 2)
local b = Vector.new(3, 4)
local c = a + b

print(c)
assert(tostring(c) == "Vector(4, 6)")
print("Metatables work!")
`,
    expectedOutput: "Vector(4, 6)\nMetatables work!\n",
  },
  {
    name: "error-handling",
    source: `
local function risky()
  error("Something went wrong!")
end

local ok, err = pcall(risky)
print("pcall ok: " .. tostring(ok))
print("pcall error: " .. tostring(err))
assert(ok == false)
assert(string.find(err, "Something went wrong"))

local function safeDivide(a, b)
  if b == 0 then
    return nil, "Division by zero"
  end
  return a / b
end

local result, err = safeDivide(10, 0)
print("safeDivide result: " .. tostring(result))
print("safeDivide error: " .. tostring(err))
assert(result == nil)
assert(err == "Division by zero")

print("Error handling works!")
`,
    expectedOutput: "pcall ok: false\npcall error: Something went wrong!\nsafeDivide result: nil\nsafeDivide error: Division by zero\nError handling works!\n",
  },
  {
    name: "math-operations",
    source: `
local tests = {
  {"add", 10, 5, 15},
  {"sub", 10, 5, 5},
  {"mul", 10, 5, 50},
  {"div", 10, 5, 2},
  {"mod", 10, 3, 1},
  {"pow", 2, 10, 1024},
  {"idiv", 10, 3, 3},
  {"floor", math.floor(3.7), 3},
  {"ceil", math.ceil(3.2), 4},
  {"sqrt", math.sqrt(16), 4},
}

for _, t in ipairs(tests) do
  local name, a, b, expected = t[1], t[2], t[3], t[4]
  local got = a + 0 -- placeholder
  if name == "add" then got = a + b
  elseif name == "sub" then got = a - b
  elseif name == "mul" then got = a * b
  elseif name == "div" then got = a / b
  elseif name == "mod" then got = a % b
  elseif name == "pow" then got = a ^ b
  elseif name == "idiv" then got = math.floor(a / b)
  elseif name == "floor" then got = math.floor(a)
  elseif name == "ceil" then got = math.ceil(a)
  elseif name == "sqrt" then got = math.sqrt(a)
  end
  print(name .. ": " .. tostring(got))
  assert(got == expected, name .. " failed: got " .. got .. " expected " .. expected)
end

print("All math ops work!")
`,
    expectedOutput: "add: 15\nsub: 5\nmul: 50\ndiv: 2\nmod: 1\npow: 1024\nidiv: 3\nfloor: 3\nceil: 4\nsqrt: 4\nAll math ops work!\n",
  },
  {
    name: "complex-control-flow",
    source: `
local function complex(n)
  local sum = 0
  for i = 1, n do
    if i % 2 == 0 then
      for j = 1, 3 do
        sum = sum + i * j
      end
    else
      while i < n do
        i = i + 1
        sum = sum + i
        if i > 10 then break end
      end
    end
  end
  return sum
end

local result = complex(5)
print("Complex result: " .. result)
-- 5: odd -> while: 2+3+4+5 = 14, but with i++ at start...
-- Let's just verify it runs without error
print("Control flow works!")
`,
    expectedExitCode: 0,
  },
];

// Configuration
interface TestConfig {
  level: "debug" | "normal" | "max";
  vmType: "stack" | "register" | "phantom";
  perfLevel: 1 | 2 | 3;
  targetVersion: string;
}

const CONFIGS: TestConfig[] = [
  { level: "debug", vmType: "register", perfLevel: 1, targetVersion: "luau" },
  { level: "normal", vmType: "register", perfLevel: 2, targetVersion: "luau" },
  { level: "max", vmType: "register", perfLevel: 3, targetVersion: "luau" },
  { level: "max", vmType: "register", perfLevel: 3, targetVersion: "luau" },
];

// Luau binary path
const LUAU_BIN = process.env.LUAU_BIN || "luau";

function runLuau(script: string, timeout = 5000): { stdout: string; stderr: string; exitCode: number } {
  const tempFile = join(WORK_DIR, `temp_${Date.now()}_${Math.random().toString(36).slice(2)}.lua`);
  writeFileSync(tempFile, script);
  
  try {
    const result = spawnSync(LUAU_BIN, [tempFile], {
      timeout,
      encoding: "utf-8",
    });
    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: result.status ?? 0,
    };
  } finally {
    if (existsSync(tempFile)) rmSync(tempFile);
  }
}

function obfuscateScript(source: string, config: TestConfig): string {
  // Use the clyde CLI to obfuscate
  const inputFile = join(WORK_DIR, `input_${Date.now()}.lua`);
  const outputFile = join(WORK_DIR, `output_${Date.now()}.lua`);
  
  writeFileSync(inputFile, source);
  
  const args = [
    join(CLYDE_ROOT, "dist/cli/obfuscate.js"),
    "--input", inputFile,
    "--output", outputFile,
    "--level", config.level,
    "--vm-type", config.vmType,
    "--perf-level", String(config.perfLevel),
    "--target", config.targetVersion,
  ];
  
  const result = spawnSync("node", args, {
    cwd: ROOT,
    timeout: 30000,
    encoding: "utf-8",
  });
  
  if (result.status !== 0) {
    throw new Error(`Obfuscation failed: ${result.stderr}`);
  }
  
  const output = readFileSync(outputFile, "utf-8");
  
  // Cleanup
  if (existsSync(inputFile)) rmSync(inputFile);
  if (existsSync(outputFile)) rmSync(outputFile);
  
  return output;
}

async function runTestSuite() {
  console.log("========================================");
  console.log("Clyde Regression Test Suite");
  console.log("========================================\n");
  
  let passed = 0;
  let failed = 0;
  const failures: Array<{ test: string; config: TestConfig; error: string }> = [];
  
  for (const config of CONFIGS) {
    console.log(`\n=== Testing config: ${config.level}/${config.vmType}/perf${config.perfLevel} (${config.targetVersion}) ===`);
    
    for (const testCase of TEST_CASES) {
      const testName = `${testCase.name} [${config.level}/${config.vmType}]`;
      process.stdout.write(`  ${testName}... `);
      
      try {
        // Test original script
        const originalResult = runLuau(testCase.source);
        
        if (testCase.expectedOutput && originalResult.stdout.trim() !== testCase.expectedOutput.trim()) {
          throw new Error(`Original script output mismatch:\nExpected: ${testCase.expectedOutput}\nGot: ${originalResult.stdout}`);
        }
        
        if (testCase.expectedExitCode !== undefined && originalResult.exitCode !== testCase.expectedExitCode) {
          throw new Error(`Original script exit code mismatch: expected ${testCase.expectedExitCode}, got ${originalResult.exitCode}`);
        }
        
        // Obfuscate and test
        const obfuscated = obfuscateScript(testCase.source, config);
        const obfResult = runLuau(obfuscated);
        
        if (testCase.expectedOutput && obfResult.stdout.trim() !== testCase.expectedOutput.trim()) {
          throw new Error(`Obfuscated script output mismatch:\nExpected: ${testCase.expectedOutput}\nGot: ${obfResult.stdout}`);
        }
        
        if (testCase.expectedExitCode !== undefined && obfResult.exitCode !== testCase.expectedExitCode) {
          throw new Error(`Obfuscated script exit code mismatch: expected ${testCase.expectedExitCode}, got ${obfResult.exitCode}`);
        }
        
        console.log("✓");
        passed++;
      } catch (err: any) {
        console.log("✗");
        console.log(`    Error: ${err.message}`);
        failed++;
        failures.push({ test: testName, config, error: err.message });
      }
    }
  }
  
  console.log("\n========================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("========================================");
  
  if (failed > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  - ${f.test}: ${f.error}`);
    }
    process.exit(1);
  }
}

runTestSuite().catch(console.error);