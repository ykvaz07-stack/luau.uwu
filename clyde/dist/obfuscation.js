export { lex } from "./lexer/Lexer.js";
export { parse } from "./parser/Parser.js";
export { obfuscate, encodeStrings, scrambleControlFlow, printChunk } from "./obfuscator/index.js";
export { printChunkOneLine } from "./obfuscator/Printer.js";
export { compile } from "./vm/Compiler.js";
export { regCompile } from "./vm/RegCompiler.js";
export { generateVM } from "./vm/vm-gen.js";
export { generateRegVM } from "./vm/reg-vm-gen.js";
