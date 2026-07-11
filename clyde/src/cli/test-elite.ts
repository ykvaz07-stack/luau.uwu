import { lex } from "../lexer/Lexer.js";
import { parse } from "../parser/Parser.js";
import { runPipeline } from "../obfuscator/Pipeline.js";
import { printChunk } from "../obfuscator/Printer.js";
import { compile } from "../vm/Compiler.js";
import { generateVM } from "../vm/vm-gen.js";

const source = `local x = 42
local name = "World"
print("Hello " .. name)
function foo(a, b)
  return a + b
end
`;

const { tokens } = lex(source);
const ast = parse(tokens);

console.log("=== Elite AST-Level Obfuscation ===");
const obfuscated = runPipeline(ast, { protectionLevel: "max", seed: 999 });
console.log("Statements:", obfuscated.body.length);
const output = printChunk(obfuscated);
console.log("Output size:", output.length, "bytes");
console.log("First 500 chars:");
console.log(output.substring(0, 500));

console.log("");
console.log("=== VM-Level Obfuscation ===");
const chunk = compile(obfuscated);
try {
  const vm = generateVM(chunk, { level: "max", executorGlobals: true, noCompression: false });
  console.log("VM output size:", vm.length, "bytes");
  console.log("First 400 chars:");
  console.log(vm.substring(0, 400));
} catch (e) {
  console.log("VM generation may have type issues:", (e as Error).message);
  const vmDebug = generateVM(chunk, { level: "debug", executorGlobals: false, noCompression: true });
  console.log("VM Debug output size:", vmDebug.length, "bytes");
  console.log(vmDebug.substring(0, 600));
}
