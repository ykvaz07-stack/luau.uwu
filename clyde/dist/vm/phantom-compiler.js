import { phantomEmit, phantomPatch, phantomPC, phantomAddConst, RK, createPhantomChunk } from "./phantom-types.js";
function allocReg(ctx) {
    const r = ctx.nextReg++;
    ctx.chunk.maxRegs = Math.max(ctx.chunk.maxRegs, r + 1);
    return r;
}
function freeReg(ctx) {
    if (ctx.nextReg > 0)
        ctx.nextReg--;
}
function allocRegs(ctx, n) {
    const r = ctx.nextReg;
    ctx.nextReg += n;
    ctx.chunk.maxRegs = Math.max(ctx.chunk.maxRegs, r + n);
    return r;
}
function freeRegs(ctx, n) {
    ctx.nextReg -= n;
    if (ctx.nextReg < 0)
        ctx.nextReg = 0;
}
function getLocalReg(ctx, name) {
    for (let c = ctx; c; c = c.parent) {
        const r = c.regs.get(name);
        if (r !== undefined)
            return r;
    }
    return null;
}
function getUpvalueIndex(ctx, name) {
    if (!ctx.parent)
        return null;
    const reg = ctx.parent.regs.get(name);
    if (reg !== undefined) {
        const existing = ctx.upvalues.findIndex(u => u[0] === 0 && u[1] === reg);
        if (existing >= 0)
            return [1, existing];
        const idx = ctx.upvalues.length;
        ctx.upvalues.push([0, reg]);
        return [1, idx];
    }
    for (let p = ctx.parent; p; p = p.parent) {
        if (p.regs.get(name) !== undefined) {
            const existing = ctx.upvalues.findIndex(u => u[0] === 0 && u[1] === p.regs.get(name));
            if (existing >= 0)
                return [1, existing];
            const idx = ctx.upvalues.length;
            ctx.upvalues.push([0, p.regs.get(name)]);
            return [1, idx];
        }
    }
    return null;
}
function compileExp(ctx, exp) {
    switch (exp.type) {
        case "NilLiteral": {
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 3 /* PhantomOp.LOADNIL */, r);
            return r;
        }
        case "BooleanLiteral": {
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 4 /* PhantomOp.LOADBOOL */, r, exp.value ? 1 : 0);
            return r;
        }
        case "NumberLiteral": {
            const kIdx = phantomAddConst(ctx.chunk, Number(exp.value));
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 2 /* PhantomOp.LOADK */, r, RK(kIdx));
            return r;
        }
        case "StringLiteral": {
            const kIdx = phantomAddConst(ctx.chunk, exp.value);
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 2 /* PhantomOp.LOADK */, r, RK(kIdx));
            return r;
        }
        case "Identifier": {
            const local = getLocalReg(ctx, exp.name);
            if (local !== null) {
                const r = allocReg(ctx);
                phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, r, local);
                return r;
            }
            const uv = getUpvalueIndex(ctx, exp.name);
            if (uv) {
                const r = allocReg(ctx);
                phantomEmit(ctx.chunk, 35 /* PhantomOp.GETUPVAL */, r, uv[0], uv[1]);
                return r;
            }
            const kIdx = phantomAddConst(ctx.chunk, exp.name);
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 5 /* PhantomOp.GETGLOBAL */, r, RK(kIdx));
            return r;
        }
        case "VarargExpression": {
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 34 /* PhantomOp.VARARG */, r);
            return r;
        }
        case "BinaryExpression": {
            const left = compileExp(ctx, exp.left);
            const right = compileExp(ctx, exp.right);
            let opMap = {
                "+": 10 /* PhantomOp.ADD */, "-": 11 /* PhantomOp.SUB */, "*": 12 /* PhantomOp.MUL */,
                "/": 13 /* PhantomOp.DIV */, "%": 14 /* PhantomOp.MOD */, "^": 15 /* PhantomOp.POW */,
                "..": 19 /* PhantomOp.CONCAT */, "==": 21 /* PhantomOp.EQ */, "~=": 21 /* PhantomOp.EQ */,
                "<": 22 /* PhantomOp.LT */, ">": 22 /* PhantomOp.LT */, "<=": 23 /* PhantomOp.LE */, ">=": 23 /* PhantomOp.LE */,
                "and": 24 /* PhantomOp.TEST */, "or": 24 /* PhantomOp.TEST */,
            };
            if (exp.operator === "~=") {
                const r = allocReg(ctx);
                phantomEmit(ctx.chunk, 21 /* PhantomOp.EQ */, r, left, right);
                phantomEmit(ctx.chunk, 17 /* PhantomOp.NOT */, r, r);
                freeReg(ctx);
                freeReg(ctx);
                return r;
            }
            if (exp.operator === ">") {
                const r = allocReg(ctx);
                phantomEmit(ctx.chunk, 22 /* PhantomOp.LT */, r, right, left);
                freeReg(ctx);
                freeReg(ctx);
                return r;
            }
            if (exp.operator === ">=") {
                const r = allocReg(ctx);
                phantomEmit(ctx.chunk, 23 /* PhantomOp.LE */, r, right, left);
                freeReg(ctx);
                freeReg(ctx);
                return r;
            }
            if (exp.operator === "and") {
                const r = left;
                const endJmp = phantomPC(ctx.chunk);
                phantomEmit(ctx.chunk, 20 /* PhantomOp.JMP */, 0, 0, 0);
                freeReg(ctx);
                const rightR = compileExp(ctx, exp.right);
                phantomPatch(ctx.chunk, endJmp, 'A', phantomPC(ctx.chunk) - endJmp);
                return rightR;
            }
            if (exp.operator === "or") {
                const r = left;
                const endJmp = phantomPC(ctx.chunk);
                phantomEmit(ctx.chunk, 20 /* PhantomOp.JMP */, 0, 0, 0);
                const rightR = compileExp(ctx, exp.right);
                phantomPatch(ctx.chunk, endJmp, 'A', phantomPC(ctx.chunk) - endJmp);
                freeReg(ctx);
                return rightR;
            }
            const op = opMap[exp.operator];
            if (op !== undefined) {
                const r = allocReg(ctx);
                phantomEmit(ctx.chunk, op, r, left, right);
                freeReg(ctx);
                freeReg(ctx);
                return r;
            }
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, r, left);
            freeReg(ctx);
            freeReg(ctx);
            return r;
        }
        case "UnaryExpression": {
            const arg = compileExp(ctx, exp.argument);
            if (exp.operator === "not") {
                phantomEmit(ctx.chunk, 17 /* PhantomOp.NOT */, arg, arg);
                return arg;
            }
            if (exp.operator === "-") {
                phantomEmit(ctx.chunk, 16 /* PhantomOp.UNM */, arg, arg);
                return arg;
            }
            if (exp.operator === "#") {
                phantomEmit(ctx.chunk, 18 /* PhantomOp.LEN */, arg, arg);
                return arg;
            }
            return arg;
        }
        case "CallExpression": {
            const fnReg = compileExp(ctx, exp.callee);
            const argRegs = [];
            for (const a of exp.args) {
                argRegs.push(compileExp(ctx, a));
            }
            const nResults = 1;
            const r = allocReg(ctx);
            if (argRegs.length > 0) {
                for (let i = 0; i < argRegs.length; i++) {
                    phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, r + 1 + i, argRegs[i]);
                }
            }
            phantomEmit(ctx.chunk, 26 /* PhantomOp.CALL */, fnReg, argRegs.length, nResults);
            phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, r, fnReg);
            for (const ar of argRegs)
                freeReg(ctx);
            return r;
        }
        case "MethodCallExpression": {
            const objReg = compileExp(ctx, exp.object);
            const methodK = phantomAddConst(ctx.chunk, exp.method);
            const methodReg = allocReg(ctx);
            phantomEmit(ctx.chunk, 7 /* PhantomOp.GETTABLE */, methodReg, objReg, RK(methodK));
            const argRegs = [objReg];
            for (const a of exp.args) {
                argRegs.push(compileExp(ctx, a));
            }
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, r + 1, objReg);
            for (let i = 0; i < exp.args.length; i++) {
                phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, r + 2 + i, argRegs[i + 1]);
            }
            phantomEmit(ctx.chunk, 26 /* PhantomOp.CALL */, methodReg, 1 + exp.args.length, 1);
            phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, r, methodReg);
            for (const ar of argRegs)
                freeReg(ctx);
            return r;
        }
        case "TableConstructor": {
            const tblReg = allocReg(ctx);
            phantomEmit(ctx.chunk, 9 /* PhantomOp.NEWTABLE */, tblReg);
            let listIdx = 1;
            for (const field of exp.fields) {
                if (field.kind === "value") {
                    const valReg = compileExp(ctx, field.value);
                    const kIdx = phantomAddConst(ctx.chunk, listIdx++);
                    phantomEmit(ctx.chunk, 8 /* PhantomOp.SETTABLE */, tblReg, RK(kIdx), valReg);
                    freeReg(ctx);
                }
                else if (field.kind === "index") {
                    const keyReg = compileExp(ctx, field.index);
                    const valReg = compileExp(ctx, field.value);
                    phantomEmit(ctx.chunk, 8 /* PhantomOp.SETTABLE */, tblReg, keyReg, valReg);
                    freeReg(ctx);
                    freeReg(ctx);
                }
            }
            return tblReg;
        }
        case "FunctionExpression": {
            const proto = compileFunction(exp, ctx);
            const protoIdx = ctx.chunk.protos ? ctx.chunk.protos.length : 0;
            if (!ctx.chunk.protos)
                ctx.chunk.protos = [];
            ctx.chunk.protos.push(proto);
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 33 /* PhantomOp.CLOSURE */, r, protoIdx);
            for (let i = 0; i < (proto.upvalues?.length || 0); i++) {
                const uv = proto.upvalues[i];
                phantomEmit(ctx.chunk, 35 /* PhantomOp.GETUPVAL */, r + 1 + i, uv[0], uv[1]);
            }
            return r;
        }
        case "ParenExpression":
            return compileExp(ctx, exp.expression);
        case "IndexExpression": {
            const obj = compileExp(ctx, exp.object);
            const idx = compileExp(ctx, exp.index);
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 7 /* PhantomOp.GETTABLE */, r, obj, idx);
            freeReg(ctx);
            freeReg(ctx);
            return r;
        }
        case "MemberExpression": {
            const obj = compileExp(ctx, exp.object);
            const kIdx = phantomAddConst(ctx.chunk, exp.property);
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 7 /* PhantomOp.GETTABLE */, r, obj, RK(kIdx));
            freeReg(ctx);
            return r;
        }
        case "StringInterpolation":
        case "IfElseExpression":
        case "TypeAssertion": {
            const r = allocReg(ctx);
            phantomEmit(ctx.chunk, 3 /* PhantomOp.LOADNIL */, r);
            return r;
        }
        default:
            throw new Error(`Unsupported expression type: ${exp.type}`);
    }
}
function compileFunction(func, parentCtx) {
    const fe = func;
    const chunk = createPhantomChunk();
    chunk.nParams = fe.params?.filter((p) => p.name !== "...").length || 0;
    chunk.isVararg = fe.params?.some((p) => p.variadic || p.name === "...") || false;
    const ctx = {
        chunk,
        regs: new Map(),
        nextReg: 0,
        loopJumps: [],
        upvalues: [],
        parent: parentCtx,
    };
    for (let i = 0; i < chunk.nParams; i++) {
        const p = fe.params[i];
        ctx.regs.set(p.name, ctx.nextReg++);
    }
    if (chunk.isVararg) {
        ctx.regs.set("...", ctx.nextReg++);
    }
    if (fe.body) {
        compileStmts(ctx, fe.body);
    }
    chunk.upvalues = ctx.upvalues.length > 0 ? ctx.upvalues : undefined;
    if (chunk.protos && chunk.protos.length === 0)
        delete chunk.protos;
    return chunk;
}
function compileStmts(ctx, stmts) {
    for (const stmt of stmts) {
        compileStmt(ctx, stmt);
    }
}
function compileStmt(ctx, stmt) {
    switch (stmt.type) {
        case "FunctionCallStatement": {
            const call = stmt.call;
            if (call.type === "CallExpression") {
                const fnReg = compileExp(ctx, call.callee);
                const nArgs = call.args.length;
                for (let i = 0; i < nArgs; i++) {
                    const argReg = compileExp(ctx, call.args[i]);
                    if (fnReg + 1 + i !== argReg) {
                        phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, fnReg + 1 + i, argReg);
                    }
                    freeReg(ctx);
                }
                phantomEmit(ctx.chunk, 26 /* PhantomOp.CALL */, fnReg, nArgs, 0);
            }
            else if (call.type === "MethodCallExpression") {
                const objReg = compileExp(ctx, call.object);
                const methodK = phantomAddConst(ctx.chunk, call.method);
                const methodReg = allocReg(ctx);
                phantomEmit(ctx.chunk, 7 /* PhantomOp.GETTABLE */, methodReg, objReg, RK(methodK));
                phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, methodReg + 1, objReg);
                const nArgs = 1 + call.args.length;
                for (let i = 0; i < call.args.length; i++) {
                    const argReg = compileExp(ctx, call.args[i]);
                    phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, methodReg + 2 + i, argReg);
                    freeReg(ctx);
                }
                freeReg(ctx);
                phantomEmit(ctx.chunk, 26 /* PhantomOp.CALL */, methodReg, nArgs, 0);
            }
            break;
        }
        case "AssignmentStatement": {
            const st = stmt;
            if (st.vars && st.vars.length > 0 && st.values && st.values.length > 0) {
                const valRegs = [];
                for (let i = 0; i < st.values.length; i++) {
                    valRegs.push(compileExp(ctx, st.values[i]));
                }
                for (let i = 0; i < st.vars.length && i < valRegs.length; i++) {
                    const v = st.vars[i];
                    if (v.type === "Identifier") {
                        const localReg = getLocalReg(ctx, v.name);
                        if (localReg !== null) {
                            phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, localReg, valRegs[i]);
                        }
                        else {
                            const uv = getUpvalueIndex(ctx, v.name);
                            if (uv) {
                                phantomEmit(ctx.chunk, 36 /* PhantomOp.SETUPVAL */, valRegs[i], uv[0], uv[1]);
                            }
                            else {
                                const kIdx = phantomAddConst(ctx.chunk, v.name);
                                phantomEmit(ctx.chunk, 6 /* PhantomOp.SETGLOBAL */, RK(kIdx), valRegs[i]);
                            }
                        }
                    }
                    else if (v.type === "IndexExpression") {
                        const objReg = compileExp(ctx, v.object);
                        const idxReg = compileExp(ctx, v.index);
                        phantomEmit(ctx.chunk, 8 /* PhantomOp.SETTABLE */, objReg, idxReg, valRegs[i]);
                        freeReg(ctx);
                        freeReg(ctx);
                    }
                    else if (v.type === "MemberExpression") {
                        const objReg = compileExp(ctx, v.object);
                        const kIdx = phantomAddConst(ctx.chunk, v.property);
                        phantomEmit(ctx.chunk, 8 /* PhantomOp.SETTABLE */, objReg, RK(kIdx), valRegs[i]);
                        freeReg(ctx);
                    }
                }
                for (const r of valRegs)
                    freeReg(ctx);
            }
            break;
        }
        case "LocalStatement": {
            const st = stmt;
            const names = st.vars.map((v) => v.name).filter(Boolean);
            if (st.values && st.values.length > 0) {
                for (let i = 0; i < st.values.length && i < names.length; i++) {
                    const reg = compileExp(ctx, st.values[i]);
                    ctx.regs.set(names[i], reg);
                }
                for (let i = st.values.length; i < names.length; i++) {
                    const reg = allocReg(ctx);
                    phantomEmit(ctx.chunk, 3 /* PhantomOp.LOADNIL */, reg);
                    ctx.regs.set(names[i], reg);
                }
            }
            else {
                for (const name of names) {
                    const reg = allocReg(ctx);
                    phantomEmit(ctx.chunk, 3 /* PhantomOp.LOADNIL */, reg);
                    ctx.regs.set(name, reg);
                }
            }
            break;
        }
        case "IfStatement": {
            const s = stmt;
            const endJumps = [];
            const branches = [
                { cond: s.condition, body: s.thenBody },
                ...(s.elseifClauses || []).map((c) => ({ cond: c.condition, body: c.body })),
            ];
            if (s.elseBody && s.elseBody.length > 0) {
                branches.push({ cond: null, body: s.elseBody });
            }
            for (let b = 0; b < branches.length; b++) {
                const branch = branches[b];
                if (branch.cond) {
                    const condReg = compileExp(ctx, branch.cond);
                    const elseJmp = phantomPC(ctx.chunk);
                    phantomEmit(ctx.chunk, 20 /* PhantomOp.JMP */, 0, condReg, 0);
                    compileStmts(ctx, branch.body);
                    if (b < branches.length - 1) {
                        const endJmp = phantomPC(ctx.chunk);
                        phantomEmit(ctx.chunk, 20 /* PhantomOp.JMP */, 0, 0, 0);
                        endJumps.push(endJmp);
                    }
                    const elseTarget = phantomPC(ctx.chunk);
                    phantomPatch(ctx.chunk, elseJmp, 'A', elseTarget - elseJmp);
                    freeReg(ctx);
                }
                else {
                    compileStmts(ctx, branch.body);
                }
            }
            for (const jmp of endJumps) {
                const target = phantomPC(ctx.chunk);
                phantomPatch(ctx.chunk, jmp, 'A', target - jmp);
            }
            break;
        }
        case "WhileStatement": {
            const s = stmt;
            const loopStart = phantomPC(ctx.chunk);
            const condReg = compileExp(ctx, s.condition);
            const exitJmp = phantomPC(ctx.chunk);
            phantomEmit(ctx.chunk, 20 /* PhantomOp.JMP */, 0, condReg, 0);
            ctx.loopJumps.push({ pc: -1, stack: ctx.nextReg, target: loopStart });
            compileStmts(ctx, s.body);
            ctx.loopJumps.pop();
            phantomEmit(ctx.chunk, 20 /* PhantomOp.JMP */, loopStart - phantomPC(ctx.chunk));
            const exitTarget = phantomPC(ctx.chunk);
            phantomPatch(ctx.chunk, exitJmp, 'A', exitTarget - exitJmp);
            freeReg(ctx);
            break;
        }
        case "RepeatStatement": {
            const s = stmt;
            const loopStart = phantomPC(ctx.chunk);
            ctx.loopJumps.push({ pc: -1, stack: ctx.nextReg, target: loopStart });
            compileStmts(ctx, s.body);
            ctx.loopJumps.pop();
            const condReg = compileExp(ctx, s.condition);
            phantomEmit(ctx.chunk, 20 /* PhantomOp.JMP */, loopStart - phantomPC(ctx.chunk), condReg, 1);
            freeReg(ctx);
            break;
        }
        case "ForNumericStatement": {
            const s = stmt;
            const varName = s.var?.name;
            const varReg = allocReg(ctx);
            const initReg = compileExp(ctx, s.start);
            phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, varReg, initReg);
            freeReg(ctx);
            const endReg = compileExp(ctx, s.end);
            phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, varReg + 1, endReg);
            freeReg(ctx);
            if (s.step) {
                const stepReg2 = compileExp(ctx, s.step);
                phantomEmit(ctx.chunk, 1 /* PhantomOp.MOVE */, varReg + 2, stepReg2);
                freeReg(ctx);
            }
            else {
                phantomEmit(ctx.chunk, 2 /* PhantomOp.LOADK */, varReg + 2, RK(phantomAddConst(ctx.chunk, 1)));
            }
            if (varName)
                ctx.regs.set(varName, varReg);
            const prepPc = phantomPC(ctx.chunk);
            phantomEmit(ctx.chunk, 29 /* PhantomOp.FORPREP */, varReg);
            ctx.loopJumps.push({ pc: -1, stack: ctx.nextReg, target: phantomPC(ctx.chunk) });
            compileStmts(ctx, s.body);
            ctx.loopJumps.pop();
            const loopPc = phantomPC(ctx.chunk);
            phantomEmit(ctx.chunk, 30 /* PhantomOp.FORLOOP */, varReg, loopPc - prepPc);
            phantomPatch(ctx.chunk, prepPc, 'C', loopPc - prepPc + 1);
            break;
        }
        case "ForInStatement": {
            const s = stmt;
            const vars = s.vars || [];
            const iter = s.iter || [];
            const body = s.body || [];
            for (const exp of iter)
                compileExp(ctx, exp);
            const tForPc = phantomPC(ctx.chunk);
            phantomEmit(ctx.chunk, 31 /* PhantomOp.TFORLOOP */);
            for (let i = 0; i < vars.length; i++) {
                ctx.regs.set(vars[i].name, i);
            }
            ctx.loopJumps.push({ pc: -1, stack: ctx.nextReg, target: phantomPC(ctx.chunk) });
            compileStmts(ctx, body);
            ctx.loopJumps.pop();
            phantomEmit(ctx.chunk, 20 /* PhantomOp.JMP */, tForPc - phantomPC(ctx.chunk));
            break;
        }
        case "ReturnStatement": {
            const s = stmt;
            if (s.values && s.values.length > 0) {
                let firstReg = 0;
                for (let i = 0; i < s.values.length; i++) {
                    const reg = compileExp(ctx, s.values[i]);
                    if (i === 0)
                        firstReg = reg;
                    if (i > 0)
                        freeReg(ctx);
                }
                phantomEmit(ctx.chunk, 28 /* PhantomOp.RETURN */, firstReg, s.values.length);
            }
            else {
                phantomEmit(ctx.chunk, 28 /* PhantomOp.RETURN */);
            }
            break;
        }
        case "BreakStatement": {
            phantomEmit(ctx.chunk, 20 /* PhantomOp.JMP */, 0, 0, 0);
            break;
        }
        case "DoStatement": {
            compileStmts(ctx, stmt.body);
            break;
        }
        default:
            break;
    }
}
export function compilePhantom(ast) {
    const chunk = createPhantomChunk();
    const ctx = {
        chunk,
        regs: new Map(),
        nextReg: 0,
        loopJumps: [],
        upvalues: [],
    };
    compileStmts(ctx, ast.body);
    chunk.upvalues = ctx.upvalues.length > 0 ? ctx.upvalues : undefined;
    if (chunk.protos && chunk.protos.length === 0)
        delete chunk.protos;
    return chunk;
}
//# sourceMappingURL=phantom-compiler.js.map