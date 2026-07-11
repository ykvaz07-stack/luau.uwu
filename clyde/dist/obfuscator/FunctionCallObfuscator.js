function makeLoc(start, end) {
    return { start, end };
}
function idExp(name, loc) {
    return { type: "Identifier", name, loc };
}
function numExp(n, loc) {
    return { type: "NumberLiteral", value: String(n), loc };
}
function createRng(seed) {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}
function getCallName(call) {
    if (call.type === "CallExpression" && call.callee.type === "Identifier") {
        return call.callee.name;
    }
    if (call.type === "MethodCallExpression") {
        return call.method;
    }
    return null;
}
function getCallArgs(call) {
    return call.args;
}
function collectFunctionCalls(body) {
    const calls = [];
    for (const stmt of body) {
        if (stmt.type === "FunctionCallStatement") {
            const call = stmt.call;
            const name = getCallName(call);
            if (name) {
                calls.push({ stmt, callee: name, args: getCallArgs(call), loc: stmt.loc });
            }
        }
        if ("body" in stmt && Array.isArray(stmt.body)) {
            calls.push(...collectFunctionCalls(stmt.body));
        }
        if ("thenBody" in stmt) {
            const s = stmt;
            calls.push(...collectFunctionCalls(s.thenBody));
            for (const c of s.elseifClauses || [])
                calls.push(...collectFunctionCalls(c.body));
            if (s.elseBody)
                calls.push(...collectFunctionCalls(s.elseBody));
        }
    }
    return calls;
}
function getCallExpr(call) {
    if (call.type === "CallExpression") {
        if (call.callee.type === "Identifier") {
            return { name: call.callee.name, args: call.args };
        }
        if (call.callee.type === "MemberExpression" && call.callee.object.type === "Identifier") {
            return { name: `${call.callee.object.name}.${call.callee.property}`, args: call.args };
        }
    }
    else if (call.type === "MethodCallExpression") {
        return { name: call.method, args: call.args };
    }
    return null;
}
function wrapCallThroughTable(stmt, call, tableName, idx, loc) {
    if (stmt.type !== "FunctionCallStatement")
        return stmt;
    const wrappedArgs = [
        { type: "IndexExpression", object: idExp(tableName, loc), index: numExp(idx, loc), loc },
        ...getCallArgs(call),
    ];
    const wrapperCall = {
        type: "CallExpression",
        callee: idExp("_wrapDispatch", loc),
        args: wrappedArgs,
        loc,
    };
    return {
        ...stmt,
        call: wrapperCall,
    };
}
function transformStatement(stmt, callInfo, tableName, rng, intensity) {
    if (stmt.type === "FunctionCallStatement") {
        const call = stmt.call;
        const info = getCallExpr(call);
        if (info && rng() < intensity) {
            const match = callInfo.find((c) => c.callee === info.name);
            if (match) {
                return wrapCallThroughTable(stmt, call, tableName, match.idx, stmt.loc);
            }
        }
    }
    if ("body" in stmt && Array.isArray(stmt.body)) {
        const s = stmt;
        return { ...s, body: s.body.map((b) => transformStatement(b, callInfo, tableName, rng, intensity)) };
    }
    if ("thenBody" in stmt) {
        const s = stmt;
        return {
            ...s,
            thenBody: s.thenBody.map((b) => transformStatement(b, callInfo, tableName, rng, intensity)),
            elseifClauses: s.elseifClauses?.map((c) => ({
                ...c,
                body: c.body.map((b) => transformStatement(b, callInfo, tableName, rng, intensity)),
            })),
            elseBody: s.elseBody?.map((b) => transformStatement(b, callInfo, tableName, rng, intensity)),
        };
    }
    return stmt;
}
export function obfuscateFunctionCalls(ast, options = {}) {
    const enabled = options.enabled !== false;
    if (!enabled)
        return ast;
    const intensity = Math.min(1, Math.max(0, options.intensity ?? 0.5));
    const seed = options.seed ?? 0;
    const rng = createRng(seed);
    const calls = collectFunctionCalls(ast.body);
    const uniqueCallees = [...new Set(calls.map((c) => c.callee))];
    if (uniqueCallees.length === 0)
        return ast;
    const callInfo = uniqueCallees.map((callee, i) => ({ callee, idx: i + 1 }));
    const tableName = `_fnTbl_${Math.floor(rng() * 100000)}`;
    const loc = ast.body[0]?.loc ?? { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };
    const tableStmt = {
        type: "LocalStatement",
        vars: [{ name: tableName, type: undefined }],
        values: [{
                type: "TableConstructor",
                fields: callInfo.map((ci) => ({
                    kind: "value",
                    value: { type: "Identifier", name: ci.callee, loc },
                })),
                loc,
            }],
        loc,
    };
    const dispatchFunc = {
        type: "LocalStatement",
        vars: [{ name: "_wrapDispatch", type: undefined }],
        values: [{
                type: "FunctionExpression",
                params: [
                    { type: "Param", name: "fn", variadic: false, loc },
                    { type: "Param", name: "...", variadic: true, loc },
                ],
                body: [
                    {
                        type: "ReturnStatement",
                        values: [{
                                type: "CallExpression",
                                callee: idExp("fn", loc),
                                args: [{ type: "VarargExpression", loc }],
                                loc,
                            }],
                        loc,
                    },
                ],
                loc,
            }],
        loc,
    };
    const transformedBody = ast.body.map((s) => transformStatement(s, callInfo, tableName, rng, intensity));
    return {
        ...ast,
        body: [tableStmt, dispatchFunc, ...transformedBody],
    };
}
//# sourceMappingURL=FunctionCallObfuscator.js.map