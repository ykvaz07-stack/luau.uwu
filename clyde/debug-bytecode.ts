import { Lexer } from "./src/lexer/Lexer.js";
import { Parser } from "./src/parser/Parser.js";
import { compilePhantom } from "./src/vm/phantom-compiler.js";

const tests: [string, string][] = [
  ["while", "local i=0 while i<3 do i=i+1 end print(i)"],
  ["for", "local s=0 for i=1,4 do s=s+i end print(s)"],
];

for (const [name, src] of tests) {
  const lex = new Lexer(src);
  const { tokens, errors } = lex.lex();
  const ast = new Parser(tokens).parse();
  const chunk = compilePhantom(ast);
  console.log(`=== ${name} ===`);
  for (let i = 0; i < chunk.code.length; i += 4) {
    console.log(`[${i/4}] op=${chunk.code[i]} A=${chunk.code[i+1]} B=${chunk.code[i+2]} C=${chunk.code[i+3]}`);
  }
  console.log("K:", JSON.stringify(chunk.K));
  console.log();
}
