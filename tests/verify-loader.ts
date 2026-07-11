#!/usr/bin/env node
/**
 * Verify loader script generation works correctly
 */

import { lex, parse, runPipeline, regCompile, generateRegVM } from "../clyde/dist/index.js";

async function main() {
  const loaderSource = String.raw`
--[[
  luau.uwu — virtualized protected loader
  /\_/\
 ( ^.^ )
  > ^ <
]]

script_key = "TEST_KEY_12345"

local function getHwid()
  local ok, result = pcall(gethwid)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end
  return ""
end

local function kick(msg)
  local ok, plr = pcall(function() return game:GetService("Players").LocalPlayer end)
  if ok and plr then
    plr:Kick(tostring(msg))
  else
    error(tostring(msg), 0)
  end
end

local key = script_key or getgenv().script_key
if type(key) ~= "string" or #key < 5 then
  kick("[luau.uwu] No valid key found.")
  return
end

local hwid = getHwid()
local loadUrl = "https://luau-uwu.vercel.app/api/scripts/test-id/load?key=" .. key
if hwid and #hwid > 0 then
  loadUrl = loadUrl .. "&hwid=" .. hwid
end

local ok, result = pcall(function()
  return game:HttpGet(loadUrl)
end)

if not ok then
  kick("[luau.uwu] Failed to contact server: " .. tostring(result))
  return
end

if result:find("luau.uwu:") then
  local msg = result:match("%-%- (.+)")
  kick(msg or "Access Denied")
  return
end

local fn, compileErr = loadstring(result)
if not fn then
  kick("[luau.uwu] Script error: " .. tostring(compileErr))
  return
end
local success, runtimeErr = pcall(fn)
if not success then
  kick("[luau.uwu] Runtime error: " .. tostring(runtimeErr))
end
`;

console.log("=== Testing Loader Script Generation ===\n");

try {
  const { tokens, errors: lexErrors } = lex(loaderSource);
  if (lexErrors.length > 0) {
    console.error("Lexer errors:", lexErrors);
    process.exit(1);
  }
  console.log("✓ Lexer passed");

  const ast = parse(tokens);
  console.log("✓ Parser passed");

  // Test with max protection (same as loader endpoint)
  const obfuscatedAst = runPipeline(ast, {
    protectionLevel: "max",
    encodeStrings: { enabled: true },
    scrambleControlFlow: { enabled: true },
    optimizePerformance: { enabled: true, level: 3, constantFolding: true, deadStoreElimination: true, gcOptimizations: true }
  });
  console.log("✓ Pipeline passed");

  const chunk = regCompile(obfuscatedAst);
  console.log("✓ regCompile passed");

  const output = generateRegVM(chunk, {
    level: "maximum",
    executorGlobals: true,
    polymorphicSeed: Date.now(),
  });
  console.log("✓ generateRegVM passed");

  console.log(`\nOutput length: ${output.length} characters`);
  console.log(`First 500 chars:\n${output.substring(0, 500)}`);
  console.log(`\nLast 500 chars:\n${output.substring(output.length - 500)}`);

  // Verify it's valid Lua syntax by checking for key VM components
  if (output.includes("while true do") && output.includes("local") && output.length > 1000) {
    console.log("\n✓ Output appears to be valid VM bytecode + runner");
  } else {
    console.error("\n✗ Output doesn't look like valid VM bytecode");
    process.exit(1);
  }

  // Save for inspection
  const fs = await import("fs");
  fs.writeFileSync("debug-loader-output.lua", output);
  console.log("\n✓ Saved to debug-loader-output.lua for inspection");

} catch (e: any) {
  console.error("✗ Error:", e.message);
  console.error(e.stack);
  process.exit(1);
}
}
main();