import { Lexer } from "../lexer/Lexer.js";
import { Parser } from "../parser/Parser.js";
import { compilePhantom } from "../vm/phantom-compiler.js";
import { generatePhantomVM } from "../vm/phantom-vm-gen.js";
const tests = [
    { name: "print", src: "print('hello')" },
    { name: "locals", src: "local a=1 local b=2 print(a+b)" },
    { name: "if", src: "if true then print(1) else print(2) end" },
    { name: "while", src: "local i=0 while i<5 do i=i+1 end" },
    { name: "for", src: "for i=1,5 do print(i) end" },
    { name: "table", src: "local t={a=1,b=2} print(t.a)" },
    { name: "function", src: "local function f(a,b)return a+b end print(f(1,2))" },
    { name: "roblox", src: "local p=game:GetService('Players') print(p.LocalPlayer)" },
];
for (const test of tests) {
    try {
        const lexer = new Lexer(test.src);
        const { tokens, errors: lexErrors } = lexer.lex();
        if (lexErrors.length > 0) {
            console.log(`[SKIP] ${test.name}: lex errors`);
            continue;
        }
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const chunk = compilePhantom(ast);
        const vm = generatePhantomVM(chunk, { level: "max", seed: 42 });
        const lex2 = new Lexer(vm);
        const { tokens: t2, errors: e2 } = lex2.lex();
        if (e2.length > 0) {
            console.log(`[FAIL] ${test.name}: ${e2.length} re-lex errors`);
            for (const e of e2)
                console.log(`  ${e.message}`);
        }
        else {
            const hasLoad = vm.includes("load(") || vm.includes("loadstring");
            console.log(`[PASS] ${test.name}: ${vm.length}B, ${t2.length} tok, load=${hasLoad}`);
        }
    }
    catch (e) {
        console.log(`[FAIL] ${test.name}: ${e.message}`);
    }
}
//# sourceMappingURL=phantom-test.js.map