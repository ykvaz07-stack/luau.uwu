import { Lexer } from "../lexer/Lexer.js";
import { Parser } from "../parser/Parser.js";
import { compilePhantom } from "../vm/phantom-compiler.js";
import { generatePhantomVM } from "../vm/phantom-vm-gen.js";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
const tests = [
    { name: "print", src: "print('ok')", expect: "ok" },
    { name: "add", src: "print(1+2)", expect: "3" },
    { name: "locals", src: "local a=5 local b=3 print(a+b)", expect: "8" },
    { name: "if", src: "if 1<2 then print('yes') else print('no') end", expect: "yes" },
    { name: "while", src: "local i=0 while i<3 do i=i+1 end print(i)", expect: "3" },
    { name: "for", src: "local s=0 for i=1,4 do s=s+i end print(s)", expect: "10" },
    { name: "table", src: "local t={a=5,b=3} print(t.a+t.b)", expect: "8" },
    { name: "func", src: "local function f(a,b)return a*b end print(f(3,4))", expect: "12" },
    { name: "concat", src: "print('hello'..' '..'world')", expect: "hello world" },
];
let passed = 0;
let failed = 0;
for (const test of tests) {
    try {
        const lexer = new Lexer(test.src);
        const { tokens, errors } = lexer.lex();
        if (errors.length > 0) {
            console.log(`[SKIP] ${test.name}: lex errors`);
            continue;
        }
        const ast = new Parser(tokens).parse();
        const chunk = compilePhantom(ast);
        const vm = generatePhantomVM(chunk, { level: "max", seed: 42, antiDebug: false });
        const outPath = join(process.env.TEMP || "/tmp", `phantom-test-${test.name}.lua`);
        writeFileSync(outPath, "_G = _ENV\n" + vm, "utf-8");
        const output = execSync(`& "C:/Users/Vassilis/AppData/Local/Programs/Lua/bin/lua.exe" "${outPath}"`, {
            encoding: "utf-8", timeout: 5000,
            shell: "powershell"
        }).trim();
        unlinkSync(outPath);
        if (output === test.expect) {
            console.log(`[PASS] ${test.name}: "${output}"`);
            passed++;
        }
        else {
            console.log(`[FAIL] ${test.name}: expected "${test.expect}", got "${output}"`);
            failed++;
        }
    }
    catch (e) {
        console.log(`[FAIL] ${test.name}: ${e.message}`);
        failed++;
    }
}
console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
//# sourceMappingURL=phantom-exec-test.js.map