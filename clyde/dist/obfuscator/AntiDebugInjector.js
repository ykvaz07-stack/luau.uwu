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
function injectAntiDebugStatements(loc, rng, intensity) {
    const stmts = [];
    const guardVar = `_ad${Math.floor(rng() * 100000)}`;
    if (rng() < intensity) {
        stmts.push({
            type: "LocalStatement",
            vars: [{ name: guardVar, type: undefined }],
            values: [{
                    type: "CallExpression",
                    callee: {
                        type: "MemberExpression",
                        object: idExp("debug", loc),
                        property: "info",
                        loc,
                    },
                    args: [numExp(1, loc), strExp("l", loc)],
                    loc,
                }],
            loc,
        });
    }
    if (rng() < intensity) {
        const checkVar = `_ad${Math.floor(rng() * 100000)}`;
        stmts.push({
            type: "LocalStatement",
            vars: [{ name: checkVar, type: undefined }],
            values: [{
                    type: "CallExpression",
                    callee: idExp("pcall", loc),
                    args: [{
                            type: "FunctionExpression",
                            params: [],
                            body: [
                                {
                                    type: "AssignmentStatement",
                                    vars: [{ type: "Identifier", name: guardVar, loc }],
                                    values: [{
                                            type: "CallExpression",
                                            callee: {
                                                type: "MemberExpression",
                                                object: idExp("debug", loc),
                                                property: "info",
                                                loc,
                                            },
                                            args: [numExp(2, loc), strExp("s", loc)],
                                            loc,
                                        }],
                                    loc,
                                },
                            ],
                            loc,
                        }],
                    loc,
                }],
            loc,
        });
    }
    if (rng() < intensity * 0.3) {
        const envCheckVar = `_ad${Math.floor(rng() * 100000)}`;
        stmts.push({
            type: "LocalStatement",
            vars: [{ name: envCheckVar, type: undefined }],
            values: [{
                    type: "CallExpression",
                    callee: idExp("rawget", loc),
                    args: [idExp("_G", loc), strExp("debug", loc)],
                    loc,
                }],
            loc,
        });
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
    const loc = ast.body[0]?.loc ?? { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };
    const antiDebugStmts = injectAntiDebugStatements(loc, rng, intensity);
    return {
        ...ast,
        body: [...antiDebugStmts, ...ast.body],
    };
}
//# sourceMappingURL=AntiDebugInjector.js.map