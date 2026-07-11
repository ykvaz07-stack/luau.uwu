export { lex, Lexer } from "./lexer/Lexer.js";
export { parse, parseWithErrors, Parser } from "./parser/Parser.js";
export { obfuscate, printChunk, printExpression, encodeStrings, scrambleControlFlow, obfuscateNumbers, flattenControlFlow, injectDeadCodePass, obfuscateFunctionCalls, scrambleTableFields, protectWithMetatables, injectAntiDebug, embedWatermark, MBAEngine, runPipeline, } from "./obfuscator/index.js";
export { compile } from "./vm/Compiler.js";
export { generateVM } from "./vm/vm-gen.js";
export { validate } from "./compiler/LuauCompiler.js";
//# sourceMappingURL=index.js.map