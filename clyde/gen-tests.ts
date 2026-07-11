import { Lexer } from "./src/lexer/Lexer.js";
import { Parser } from "./src/parser/Parser.js";
import { compilePhantom } from "./src/vm/phantom-compiler.js";
import { generatePhantomVM } from "./src/vm/phantom-vm-gen.js";
import { writeFileSync } from "fs";

const tests = [
  ["print", "print('ok')"],
  ["add", "print(1+2)"],
  ["locals", "local a=5 local b=3 print(a+b)"],
  ["if", "if 1<2 then print('yes') else print('no') end"],
  ["while", "local i=0 while i<3 do i=i+1 end print(i)"],
  ["for", "local s=0 for i=1,4 do s=s+i end print(s)"],
  ["table", "local t={a=5,b=3} print(t.a+t.b)"],
  ["func", "local function f(a,b)return a*b end print(f(3,4))"],
  ["concat", "print('hello'..' '..'world')"],
];

for (const [name, src] of tests) {
  const lex = new Lexer(src);
  const { tokens, errors } = lex.lex();
  if (errors.length) { console.log(name, "lex err:", errors); continue; }
  const ast = new Parser(tokens).parse();
  const chunk = compilePhantom(ast);
  const vm = generatePhantomVM(chunk, { level: "max", seed: 42, antiDebug: false });
  const p = "C:\\Users\\Vassilis\\AppData\\Local\\Temp\\phantom-" + name + ".lua";
  writeFileSync(p, "_G = _ENV\n" + vm);
  console.log(name, "->", p);
}
