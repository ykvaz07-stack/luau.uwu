const defaultLoc = {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
};
function makeLoc(s, e) {
    return { start: s, end: e };
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
function callExp(callee, args, loc) {
    return { type: "CallExpression", callee, args, loc };
}
function binExp(left, op, right, loc) {
    return { type: "BinaryExpression", operator: op, left, right, loc };
}
function createRng(seed) {
    let s = seed | 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function mbaInt(n, rng, loc) {
    const v = Math.floor(rng() * 4);
    switch (v) {
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
        default: {
            const a = Math.floor(rng() * 100) + 1;
            const b = Math.floor(rng() * 100) + 1;
            const s = a + b;
            const d = n - s;
            if (d >= 0)
                return binExp(binExp(numExp(a, loc), "+", numExp(b, loc), loc), "+", numExp(d, loc), loc);
            return binExp(binExp(numExp(a, loc), "+", numExp(b, loc), loc), "-", numExp(-d, loc), loc);
        }
    }
}
function makeLineCheck(loc, rng) {
    const varLine = `_ln${Math.floor(rng() * 100000)}`;
    const varOk = `_ln${Math.floor(rng() * 100000)}`;
    const expectedLine = 1 + Math.floor(rng() * 50);
    const stmts = [];
    stmts.push({
        type: "LocalStatement",
        vars: [{ name: varOk }],
        values: [callExp(idExp("pcall", loc), [
                {
                    type: "FunctionExpression",
                    params: [],
                    body: [{
                            type: "ReturnStatement",
                            values: [callExp(idExp("error", loc), [
                                    strExp("x", loc),
                                    numExp(0, loc),
                                ], loc)],
                        }],
                    loc,
                },
            ], loc)],
        loc,
    });
    stmts.push({
        type: "LocalStatement",
        vars: [{ name: varLine }],
        values: [{
                type: "FunctionExpression",
                params: [],
                body: [
                    { type: "FunctionCallStatement", call: callExp({ type: "MemberExpression", object: idExp("debug", loc), property: "getinfo", loc }, [numExp(1, loc), strExp("l", loc)], loc), loc },
                    {
                        type: "ReturnStatement",
                        values: [numExp(expectedLine, loc)],
                    },
                ],
                loc,
            }],
        loc,
    });
    stmts.push({
        type: "IfStatement",
        condition: binExp(callExp({ type: "MemberExpression", object: idExp("debug", loc), property: "getinfo", loc }, [numExp(1, loc), strExp("l", loc)], loc), "~=", nilExp(loc), loc),
        thenBody: [{
                type: "WhileStatement",
                condition: boolExp(true, loc),
                body: [],
                loc,
            }],
        elseifClauses: [],
        loc,
    });
    return stmts;
}
function makeSemicolonObfuscation(loc, rng) {
    const varV = `_sc${Math.floor(rng() * 100000)}`;
    const stmts = [
        {
            type: "LocalStatement",
            vars: [{ name: varV }],
            values: [numExp(42, loc)],
            loc,
        },
        {
            type: "AssignmentStatement",
            vars: [{ type: "Identifier", name: varV, loc }],
            values: [binExp(idExp(varV, loc), "+", numExp(1, loc), loc)],
            loc,
        },
    ];
    for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) {
        const v2 = `_sc${Math.floor(rng() * 100000)}`;
        stmts.push({
            type: "LocalStatement",
            vars: [{ name: v2 }],
            values: [callExp(idExp("tostring", loc), [idExp(varV, loc)], loc)],
            loc,
        });
        stmts.push({
            type: "LocalStatement",
            vars: [{ name: v2 }],
            values: [nilExp(loc)],
            loc,
        });
    }
    return stmts;
}
function makeBackslashTrap(str, rng) {
    const chars = '\\!\\:\\#\\@\\%\\^';
    let result = str;
    if (str.length > 3 && rng() > 0.4) {
        const pos = 1 + Math.floor(rng() * (str.length - 2));
        result = str.slice(0, pos) + chars.charAt(Math.floor(rng() * 3) * 2) + str.slice(pos);
    }
    return result;
}
function walkExpressions(exp, rng) {
    if (exp.type === "StringLiteral" && rng() > 0.4) {
        return { ...exp, value: makeBackslashTrap(exp.value, rng) };
    }
    if (exp.type === "StringInterpolation") {
        const si = exp;
        return {
            ...si,
            parts: si.parts.map((p) => typeof p === "string" ? makeBackslashTrap(p, rng) : walkExpressions(p, rng)),
        };
    }
    if ("callee" in exp && exp.callee) {
        return { ...exp, callee: walkExpressions(exp.callee, rng) };
    }
    if ("args" in exp && exp.args) {
        return { ...exp, args: exp.args.map((a) => walkExpressions(a, rng)) };
    }
    if ("left" in exp && exp.left) {
        return {
            ...exp,
            left: walkExpressions(exp.left, rng),
            right: walkExpressions(exp.right, rng),
        };
    }
    return exp;
}
function walkStatements(stmts, rng) {
    return stmts.map(s => {
        if (s.type === "IfStatement") {
            return {
                ...s,
                condition: walkExpressions(s.condition, rng),
                thenBody: walkStatements(s.thenBody, rng),
                elseifClauses: s.elseifClauses.map(c => ({
                    ...c,
                    condition: walkExpressions(c.condition, rng),
                    body: walkStatements(c.body, rng),
                })),
                elseBody: s.elseBody ? walkStatements(s.elseBody, rng) : undefined,
            };
        }
        if (s.type === "WhileStatement") {
            return {
                ...s,
                condition: walkExpressions(s.condition, rng),
                body: walkStatements(s.body, rng),
            };
        }
        if (s.type === "RepeatStatement") {
            return {
                ...s,
                condition: walkExpressions(s.condition, rng),
                body: walkStatements(s.body, rng),
            };
        }
        if (s.type === "FunctionCallStatement") {
            return { ...s, call: walkExpressions(s.call, rng) };
        }
        if (s.type === "AssignmentStatement") {
            return {
                ...s,
                vars: s.vars.map(v => {
                    if (v.type === "IndexExpression")
                        return { ...v, object: walkExpressions(v.object, rng), index: walkExpressions(v.index, rng) };
                    if (v.type === "MemberExpression")
                        return { ...v, object: walkExpressions(v.object, rng) };
                    return v;
                }),
                values: s.values.map(v => walkExpressions(v, rng)),
            };
        }
        if (s.type === "LocalStatement") {
            return {
                ...s,
                values: s.values ? s.values.map(v => walkExpressions(v, rng)) : undefined,
            };
        }
        if (s.type === "FunctionStatement" || s.type === "LocalFunctionStatement") {
            const fs = s;
            return {
                ...fs,
                body: walkStatements(fs.body, rng),
            };
        }
        return s;
    });
}
export function injectAntiBeautify(ast, options = {}) {
    const enabled = options.enabled !== false;
    if (!enabled)
        return ast;
    const seed = options.seed ?? 0;
    const rng = createRng(seed);
    const intensity = Math.min(1, Math.max(0, options.intensity ?? 0.5));
    const loc = ast.body[0]?.loc ?? defaultLoc;
    const stmts = [];
    if (rng() < intensity) {
        stmts.push(...makeLineCheck(loc, rng));
    }
    if (rng() < intensity * 0.7) {
        stmts.push(...makeSemicolonObfuscation(loc, rng));
    }
    const body = walkStatements(ast.body, rng);
    return {
        ...ast,
        body: [...stmts, ...body],
    };
}
//# sourceMappingURL=AntiBeautifyInjector.js.map