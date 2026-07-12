import { MBAEngine } from "./MBAExpressionEngine.js";
function makeLoc(start, end) {
    return { start, end };
}
function transformExpression(exp, engine) {
    if (exp.type === "BinaryExpression") {
        return {
            ...exp,
            left: transformExpression(exp.left, engine),
            right: transformExpression(exp.right, engine),
        };
    }
    if (exp.type === "UnaryExpression") {
        return { ...exp, argument: transformExpression(exp.argument, engine) };
    }
    if (exp.type === "CallExpression") {
        return {
            ...exp,
            callee: transformExpression(exp.callee, engine),
            args: exp.args.map((a) => transformExpression(a, engine)),
        };
    }
    if (exp.type === "MethodCallExpression") {
        return {
            ...exp,
            object: transformExpression(exp.object, engine),
            args: exp.args.map((a) => transformExpression(a, engine)),
        };
    }
    if (exp.type === "IndexExpression") {
        return {
            ...exp,
            object: transformExpression(exp.object, engine),
            index: transformExpression(exp.index, engine),
        };
    }
    if (exp.type === "MemberExpression") {
        return { ...exp, object: transformExpression(exp.object, engine) };
    }
    if (exp.type === "TableConstructor") {
        return {
            ...exp,
            fields: exp.fields.map((f) => {
                if (f.kind === "index")
                    return { ...f, index: transformExpression(f.index, engine), value: transformExpression(f.value, engine) };
                return { ...f, value: transformExpression(f.value, engine) };
            }),
        };
    }
    if (exp.type === "FunctionExpression") {
        return {
            ...exp,
            body: exp.body.map((s) => transformStatement(s, engine)),
        };
    }
    if (exp.type === "ParenExpression") {
        return { ...exp, expression: transformExpression(exp.expression, engine) };
    }
    if (exp.type === "TypeAssertion") {
        return { ...exp, expression: transformExpression(exp.expression, engine) };
    }
    if (exp.type === "IfElseExpression") {
        return {
            ...exp,
            condition: transformExpression(exp.condition, engine),
            thenExp: transformExpression(exp.thenExp, engine),
            elseifClauses: exp.elseifClauses.map((c) => ({
                ...c,
                condition: transformExpression(c.condition, engine),
                value: transformExpression(c.value, engine),
            })),
            elseExp: transformExpression(exp.elseExp, engine),
        };
    }
    if (exp.type === "StringInterpolation") {
        return {
            ...exp,
            parts: exp.parts.map((p) => typeof p === "string" ? p : transformExpression(p, engine)),
        };
    }
    return exp;
}
function wrapWithOpaque(condition, loc, engine) {
    // Mix standard and identity-based opaque predicates for stronger protection
    const useIdentity = engine["rng"]() > 0.6;
    const { condition: opaque } = useIdentity
        ? engine.createIdentityOpaque(loc)
        : engine.createOpaquePredicate(loc);
    return {
        type: "BinaryExpression",
        operator: "and",
        left: opaque,
        right: condition,
        loc,
    };
}
function transformStatement(stmt, engine) {
    switch (stmt.type) {
        case "IfStatement": {
            const newCondition = wrapWithOpaque(transformExpression(stmt.condition, engine), stmt.condition.loc, engine);
            return {
                ...stmt,
                condition: newCondition,
                thenBody: stmt.thenBody.map((s) => transformStatement(s, engine)),
                elseifClauses: stmt.elseifClauses.map((c) => {
                    return {
                        condition: wrapWithOpaque(transformExpression(c.condition, engine), c.condition.loc, engine),
                        body: c.body.map((s) => transformStatement(s, engine)),
                    };
                }),
                elseBody: stmt.elseBody?.map((s) => transformStatement(s, engine)),
            };
        }
        case "WhileStatement": {
            return {
                ...stmt,
                condition: wrapWithOpaque(transformExpression(stmt.condition, engine), stmt.condition.loc, engine),
                body: stmt.body.map((s) => transformStatement(s, engine)),
            };
        }
        case "RepeatStatement": {
            return {
                ...stmt,
                body: stmt.body.map((s) => transformStatement(s, engine)),
                condition: wrapWithOpaque(transformExpression(stmt.condition, engine), stmt.condition.loc, engine),
            };
        }
        case "LocalStatement":
            return {
                ...stmt,
                values: stmt.values?.map((e) => transformExpression(e, engine)),
            };
        case "AssignmentStatement":
            return {
                ...stmt,
                vars: stmt.vars.map((v) => {
                    if (v.type === "Identifier")
                        return v;
                    if (v.type === "IndexExpression")
                        return {
                            ...v,
                            object: transformExpression(v.object, engine),
                            index: transformExpression(v.index, engine),
                        };
                    return { ...v, object: transformExpression(v.object, engine) };
                }),
                values: stmt.values.map((e) => transformExpression(e, engine)),
            };
        case "CompoundAssignmentStatement":
            return {
                ...stmt,
                var: stmt.var.type === "Identifier"
                    ? stmt.var
                    : {
                        ...stmt.var,
                        object: transformExpression(stmt.var.object, engine),
                        ...(stmt.var.type === "IndexExpression" && {
                            index: transformExpression(stmt.var.index, engine),
                        }),
                    },
                value: transformExpression(stmt.value, engine),
            };
        case "FunctionCallStatement":
            return {
                ...stmt,
                call: transformExpression(stmt.call, engine),
            };
        case "ReturnStatement":
            return {
                ...stmt,
                values: stmt.values?.map((e) => transformExpression(e, engine)),
            };
        case "ForNumericStatement":
            return {
                ...stmt,
                start: transformExpression(stmt.start, engine),
                end: transformExpression(stmt.end, engine),
                step: stmt.step ? transformExpression(stmt.step, engine) : undefined,
                body: stmt.body.map((s) => transformStatement(s, engine)),
            };
        case "ForInStatement":
            return {
                ...stmt,
                iter: stmt.iter.map((e) => transformExpression(e, engine)),
                body: stmt.body.map((s) => transformStatement(s, engine)),
            };
        case "LocalFunctionStatement":
        case "FunctionStatement":
        case "TypeFunctionStatement":
        case "ExportTypeFunctionStatement":
            return {
                ...stmt,
                body: stmt.body.map((s) => transformStatement(s, engine)),
            };
        case "DoStatement":
            return {
                ...stmt,
                body: stmt.body.map((s) => transformStatement(s, engine)),
            };
        default:
            return stmt;
    }
}
export function scrambleControlFlow(ast, options = {}) {
    const enabled = options.enabled !== false;
    if (!enabled)
        return ast;
    const seed = options.seed ?? 0;
    const engine = new MBAEngine({ seed });
    return {
        ...ast,
        body: ast.body.map((s) => transformStatement(s, engine)),
    };
}
//# sourceMappingURL=ControlFlowScrambler.js.map