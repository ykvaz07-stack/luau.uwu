import { MBAEngine } from "./MBAExpressionEngine.js";
function transformExpression(exp, engine, useBitops) {
    if (exp.type === "NumberLiteral") {
        const n = Number(exp.value);
        if (!Number.isFinite(n))
            return exp;
        if (n >= 0 && n <= 255 && useBitops && Math.random() > 0.7) {
            return engine.obfuscateNumberWithBitops(n, exp.loc);
        }
        const needsParen = n >= 0 && n <= 255;
        const result = engine.obfuscateNumber(n, exp.loc);
        if (needsParen) {
            return { type: "ParenExpression", expression: result, loc: exp.loc };
        }
        return result;
    }
    if (exp.type === "BinaryExpression") {
        return {
            ...exp,
            left: transformExpression(exp.left, engine, useBitops),
            right: transformExpression(exp.right, engine, useBitops),
        };
    }
    if (exp.type === "UnaryExpression") {
        return { ...exp, argument: transformExpression(exp.argument, engine, useBitops) };
    }
    if (exp.type === "CallExpression") {
        return {
            ...exp,
            callee: transformExpression(exp.callee, engine, useBitops),
            args: exp.args.map((a) => transformExpression(a, engine, useBitops)),
        };
    }
    if (exp.type === "MethodCallExpression") {
        return {
            ...exp,
            object: transformExpression(exp.object, engine, useBitops),
            args: exp.args.map((a) => transformExpression(a, engine, useBitops)),
        };
    }
    if (exp.type === "IndexExpression") {
        return {
            ...exp,
            object: transformExpression(exp.object, engine, useBitops),
            index: transformExpression(exp.index, engine, useBitops),
        };
    }
    if (exp.type === "MemberExpression") {
        return { ...exp, object: transformExpression(exp.object, engine, useBitops) };
    }
    if (exp.type === "TableConstructor") {
        return {
            ...exp,
            fields: exp.fields.map((f) => {
                if (f.kind === "index")
                    return { ...f, index: transformExpression(f.index, engine, useBitops), value: transformExpression(f.value, engine, useBitops) };
                if (f.kind === "named")
                    return { ...f, value: transformExpression(f.value, engine, useBitops) };
                return { ...f, value: transformExpression(f.value, engine, useBitops) };
            }),
        };
    }
    if (exp.type === "FunctionExpression") {
        return {
            ...exp,
            body: exp.body.map((s) => transformStatement(s, engine, useBitops)),
        };
    }
    if (exp.type === "ParenExpression") {
        return { ...exp, expression: transformExpression(exp.expression, engine, useBitops) };
    }
    if (exp.type === "TypeAssertion") {
        return { ...exp, expression: transformExpression(exp.expression, engine, useBitops) };
    }
    if (exp.type === "IfElseExpression") {
        return {
            ...exp,
            condition: transformExpression(exp.condition, engine, useBitops),
            thenExp: transformExpression(exp.thenExp, engine, useBitops),
            elseifClauses: exp.elseifClauses.map((c) => ({
                ...c,
                condition: transformExpression(c.condition, engine, useBitops),
                value: transformExpression(c.value, engine, useBitops),
            })),
            elseExp: transformExpression(exp.elseExp, engine, useBitops),
        };
    }
    if (exp.type === "StringInterpolation") {
        return {
            ...exp,
            parts: exp.parts.map((p) => typeof p === "string" ? p : transformExpression(p, engine, useBitops)),
        };
    }
    return exp;
}
function transformStatement(stmt, engine, useBitops) {
    switch (stmt.type) {
        case "LocalStatement":
            return {
                ...stmt,
                values: stmt.values?.map((e) => transformExpression(e, engine, useBitops)),
            };
        case "AssignmentStatement":
            return {
                ...stmt,
                vars: stmt.vars.map((v) => {
                    if (v.type === "Identifier")
                        return v;
                    if (v.type === "IndexExpression")
                        return { ...v, object: transformExpression(v.object, engine, useBitops), index: transformExpression(v.index, engine, useBitops) };
                    return { ...v, object: transformExpression(v.object, engine, useBitops) };
                }),
                values: stmt.values.map((e) => transformExpression(e, engine, useBitops)),
            };
        case "CompoundAssignmentStatement":
            return {
                ...stmt,
                var: stmt.var.type === "Identifier" ? stmt.var : {
                    ...stmt.var,
                    object: transformExpression(stmt.var.object, engine, useBitops),
                    ...(stmt.var.type === "IndexExpression" && { index: transformExpression(stmt.var.index, engine, useBitops) }),
                },
                value: transformExpression(stmt.value, engine, useBitops),
            };
        case "FunctionCallStatement":
            return { ...stmt, call: transformExpression(stmt.call, engine, useBitops) };
        case "ReturnStatement":
            return { ...stmt, values: stmt.values?.map((e) => transformExpression(e, engine, useBitops)) };
        case "IfStatement":
            return {
                ...stmt,
                condition: transformExpression(stmt.condition, engine, useBitops),
                thenBody: stmt.thenBody.map((s) => transformStatement(s, engine, useBitops)),
                elseifClauses: stmt.elseifClauses?.map((c) => ({
                    ...c,
                    condition: transformExpression(c.condition, engine, useBitops),
                    body: c.body.map((s) => transformStatement(s, engine, useBitops)),
                })),
                elseBody: stmt.elseBody?.map((s) => transformStatement(s, engine, useBitops)),
            };
        case "ForNumericStatement":
            return {
                ...stmt,
                start: transformExpression(stmt.start, engine, useBitops),
                end: transformExpression(stmt.end, engine, useBitops),
                step: stmt.step ? transformExpression(stmt.step, engine, useBitops) : undefined,
                body: stmt.body.map((s) => transformStatement(s, engine, useBitops)),
            };
        case "ForInStatement":
            return {
                ...stmt,
                iter: stmt.iter.map((e) => transformExpression(e, engine, useBitops)),
                body: stmt.body.map((s) => transformStatement(s, engine, useBitops)),
            };
        case "LocalFunctionStatement":
        case "FunctionStatement":
        case "TypeFunctionStatement":
        case "ExportTypeFunctionStatement":
            return {
                ...stmt,
                body: stmt.body.map((s) => transformStatement(s, engine, useBitops)),
            };
        case "DoStatement":
        case "WhileStatement":
        case "RepeatStatement":
            return {
                ...stmt,
                ...(stmt.type === "WhileStatement" && { condition: transformExpression(stmt.condition, engine, useBitops) }),
                ...(stmt.type === "RepeatStatement" && { condition: transformExpression(stmt.condition, engine, useBitops) }),
                body: stmt.body.map((s) => transformStatement(s, engine, useBitops)),
            };
        default:
            return stmt;
    }
}
export function obfuscateNumbers(ast, options = {}) {
    const enabled = options.enabled !== false;
    if (!enabled)
        return ast;
    const engine = new MBAEngine({ seed: options.seed ?? 0 });
    const useBitops = options.useBitops ?? true;
    return {
        ...ast,
        body: ast.body.map((s) => transformStatement(s, engine, useBitops)),
    };
}
//# sourceMappingURL=NumberObfuscator.js.map