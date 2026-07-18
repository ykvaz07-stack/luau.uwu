const defaultLoc = {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
};
function makeLoc(start, end) {
    return { start, end };
}
function idExp(name, loc) {
    return { type: "Identifier", name, loc };
}
function numExp(n, loc) {
    return { type: "NumberLiteral", value: String(n), loc };
}
function strExp(s, loc) {
    return { type: "StringLiteral", value: s, loc };
}
function boolExp(v, loc) {
    return { type: "BooleanLiteral", value: v, loc };
}
function nilExp(loc) {
    return { type: "NilLiteral", loc };
}
function binExp(left, op, right, loc) {
    return { type: "BinaryExpression", operator: op, left, right, loc };
}
function createRng(seed) {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}
function mbaInt(n, rng, loc) {
    const variant = Math.floor(rng() * 4);
    switch (variant) {
        case 0: {
            const a = Math.floor(rng() * 50) + 1;
            return binExp(numExp(n + a, loc), "-", numExp(a, loc), loc);
        }
        case 1: {
            const a = Math.floor(rng() * 20) + 2;
            const q = Math.floor(n / a);
            const r = n - q * a;
            if (q < 1)
                return numExp(n, loc);
            return binExp(binExp(numExp(a, loc), "*", numExp(q, loc), loc), "+", numExp(r, loc), loc);
        }
        case 2: {
            const a = Math.floor(rng() * 100) + 1;
            const b = Math.floor(rng() * 100) + 1;
            const sum = a + b;
            const diff = n - sum;
            if (diff >= 0)
                return binExp(binExp(numExp(a, loc), "+", numExp(b, loc), loc), "+", numExp(diff, loc), loc);
            return binExp(binExp(numExp(a, loc), "+", numExp(b, loc), loc), "-", numExp(-diff, loc), loc);
        }
        default: {
            const a = Math.floor(rng() * 10) + 2;
            const p = Math.floor(rng() * 50) + 1;
            const t = n + p;
            const q = Math.floor(t / a);
            const r = t - q * a;
            const expr = binExp(numExp(a, loc), "*", numExp(q, loc), loc);
            return binExp(binExp(expr, "+", numExp(r, loc), loc), "-", numExp(p, loc), loc);
        }
    }
}
function makeTamperBlock(loc, rng, intensity) {
    if (intensity >= 0.85) {
        return [{
                type: "WhileStatement",
                condition: boolExp(true, loc),
                body: [],
                loc,
            }];
    }
    if (intensity >= 0.6) {
        return [{
                type: "FunctionCallStatement",
                call: {
                    type: "CallExpression",
                    callee: idExp("error", loc),
                    args: [strExp("tamper", loc), numExp(0, loc)],
                    loc,
                },
                loc,
            }];
    }
    return [{
            type: "AssignmentStatement",
            vars: [{ type: "Identifier", name: `_ad${Math.floor(rng() * 100000)}`, loc }],
            values: [boolExp(false, loc)],
            loc,
        }];
}
function localStmt(name, value, loc) {
    return {
        type: "LocalStatement",
        vars: [{ name, type: undefined }],
        values: value !== undefined ? [value] : undefined,
        loc,
    };
}
function callExp(callee, args, loc) {
    return { type: "CallExpression", callee, args, loc };
}
function memberExp(object, property, loc) {
    return { type: "MemberExpression", object, property, loc };
}
function ifStmt(cond, thenBody, loc) {
    return {
        type: "IfStatement",
        condition: cond,
        thenBody,
        elseifClauses: [],
        loc,
    };
}
function typeCallExp(arg, loc) {
    return callExp(idExp("type", loc), [arg], loc);
}
function pcallMemberExp(obj, prop, loc) {
    const func = {
        type: "FunctionExpression",
        params: [],
        body: [{ type: "ReturnStatement", values: [memberExp(obj, prop, loc)] }],
        loc,
    };
    return callExp(idExp("pcall", loc), [func], loc);
}
function pcallCallExp(callee, args, loc) {
    const func = {
        type: "FunctionExpression",
        params: [],
        body: [{ type: "ReturnStatement", values: [{ type: "CallExpression", callee, args, loc }] }],
        loc,
    };
    return callExp(idExp("pcall", loc), [func], loc);
}
function makeHookDetection(loc, rng, intensity) {
    const varOk = `_ad${Math.floor(rng() * 100000)}`;
    const varResult = `_ad${Math.floor(rng() * 100000)}`;
    const stmts = [
        {
            type: "LocalStatement",
            vars: [{ name: varOk }, { name: varResult }],
            values: [pcallMemberExp(idExp("debug", loc), "gethook", loc)],
            loc,
        },
    ];
    if (intensity >= 0.5) {
        const notNil = binExp(typeCallExp(idExp(varResult, loc), loc), "~=", nilExp(loc), loc);
        const truthy = idExp(varResult, loc);
        stmts.push(ifStmt(binExp(notNil, "and", truthy, loc), makeTamperBlock(loc, rng, intensity), loc));
    }
    return stmts;
}
function makeCallDepthCheck(loc, rng, intensity) {
    const varOk = `_ad${Math.floor(rng() * 100000)}`;
    const varName = `_ad${Math.floor(rng() * 100000)}`;
    const depthArg = mbaInt(5, rng, loc);
    const stmts = [
        {
            type: "LocalStatement",
            vars: [{ name: varOk }, { name: varName }],
            values: [pcallCallExp(memberExp(idExp("debug", loc), "info", loc), [depthArg, strExp("n", loc)], loc)],
            loc,
        },
    ];
    if (intensity >= 0.55) {
        const notNil = binExp(typeCallExp(idExp(varName, loc), loc), "~=", nilExp(loc), loc);
        const truthy = idExp(varName, loc);
        stmts.push(ifStmt(binExp(notNil, "and", truthy, loc), makeTamperBlock(loc, rng, intensity), loc));
    }
    return stmts;
}
function makeStackFrameCheck(loc, rng, intensity) {
    const varOk1 = `_ad${Math.floor(rng() * 100000)}`;
    const varName1 = `_ad${Math.floor(rng() * 100000)}`;
    const varOk2 = `_ad${Math.floor(rng() * 100000)}`;
    const varName2 = `_ad${Math.floor(rng() * 100000)}`;
    const frame1Arg = mbaInt(1, rng, loc);
    const frame2Arg = mbaInt(2, rng, loc);
    const stmts = [
        {
            type: "LocalStatement",
            vars: [{ name: varOk1 }, { name: varName1 }],
            values: [pcallCallExp(memberExp(idExp("debug", loc), "info", loc), [frame1Arg, strExp("n", loc)], loc)],
            loc,
        },
        {
            type: "LocalStatement",
            vars: [{ name: varOk2 }, { name: varName2 }],
            values: [pcallCallExp(memberExp(idExp("debug", loc), "info", loc), [frame2Arg, strExp("n", loc)], loc)],
            loc,
        },
    ];
    if (intensity >= 0.6) {
        const check = binExp(binExp(idExp(varOk1, loc), "and", idExp(varOk2, loc), loc), "and", binExp(idExp(varName1, loc), "==", idExp(varName2, loc), loc), loc);
        stmts.push(ifStmt(check, makeTamperBlock(loc, rng, intensity), loc));
    }
    return stmts;
}
function makeEnvironmentLock(loc, rng, intensity) {
    const envVar = `_ad${Math.floor(rng() * 100000)}`;
    const stmts = [
        localStmt(envVar, callExp(idExp("rawget", loc), [idExp("_G", loc), strExp("_G", loc)], loc), loc),
    ];
    if (intensity >= 0.4) {
        const tampered = binExp(idExp(envVar, loc), "~=", idExp("_G", loc), loc);
        stmts.push(ifStmt(tampered, makeTamperBlock(loc, rng, intensity), loc));
    }
    return stmts;
}
export function injectAntiDebug(ast, options = {}) {
    const enabled = options.enabled !== false;
    if (!enabled)
        return ast;
    const seed = options.seed ?? 0;
    const rng = createRng(seed);
    const intensity = Math.min(1, Math.max(0, options.intensity ?? 0.4));
    const useDebug = options.useDebugLibrary !== false;
    const crashOnDetect = options.crashOnDetection !== false;
    const adjustedIntensity = crashOnDetect ? intensity : Math.min(intensity, 0.49);
    const loc = ast.body[0]?.loc ?? defaultLoc;
    const stmts = [];
    if (useDebug && options.hookCheck !== false && rng() < intensity) {
        stmts.push(...makeHookDetection(loc, rng, adjustedIntensity));
    }
    if (useDebug && options.callDepthCheck !== false && rng() < intensity) {
        stmts.push(...makeCallDepthCheck(loc, rng, adjustedIntensity));
    }
    if (useDebug && options.stackFrameCheck !== false && rng() < intensity) {
        stmts.push(...makeStackFrameCheck(loc, rng, adjustedIntensity));
    }
    if (options.environmentLock !== false && rng() < intensity) {
        stmts.push(...makeEnvironmentLock(loc, rng, adjustedIntensity));
    }
    return {
        ...ast,
        body: [...stmts, ...ast.body],
    };
}
//# sourceMappingURL=AntiDebugInjector.js.map