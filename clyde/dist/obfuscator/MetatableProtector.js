function makeLoc(start, end) {
    return { start, end };
}
function idExp(name, loc) {
    return { type: "Identifier", name, loc };
}
function createRng(seed) {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}
export function protectWithMetatables(ast, options = {}) {
    const enabled = options.enabled !== false;
    if (!enabled)
        return ast;
    const seed = options.seed ?? 0;
    const rng = createRng(seed);
    const loc = ast.body[0]?.loc ?? { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };
    const readOnlyTableName = `_mt_ro_${Math.floor(rng() * 100000)}`;
    const wrapTableName = `_mt_wrap_${Math.floor(rng() * 100000)}`;
    const readOnlyMetatable = {
        type: "LocalStatement",
        vars: [{ name: readOnlyTableName, type: undefined }],
        values: [{
                type: "FunctionExpression",
                params: [{ type: "Param", name: "t", variadic: false, loc }],
                body: [
                    {
                        type: "IfStatement",
                        condition: {
                            type: "BinaryExpression",
                            operator: "==",
                            left: {
                                type: "CallExpression",
                                callee: { type: "Identifier", name: "typeof", loc },
                                args: [idExp("t", loc)],
                                loc,
                            },
                            right: { type: "StringLiteral", value: "userdata", loc },
                            loc,
                        },
                        body: [
                            { type: "ReturnStatement", values: [idExp("t", loc)], loc },
                        ],
                        loc,
                    },
                    {
                        type: "IfStatement",
                        condition: {
                            type: "BinaryExpression",
                            operator: "==",
                            left: {
                                type: "CallExpression",
                                callee: { type: "Identifier", name: "typeof", loc },
                                args: [idExp("t", loc)],
                                loc,
                            },
                            right: { type: "StringLiteral", value: "Instance", loc },
                            loc,
                        },
                        body: [
                            { type: "ReturnStatement", values: [idExp("t", loc)], loc },
                        ],
                        loc,
                    },
                    {
                        type: "IfStatement",
                        condition: {
                            type: "BinaryExpression",
                            operator: "and",
                            left: {
                                type: "BinaryExpression",
                                operator: "==",
                                left: {
                                    type: "CallExpression",
                                    callee: { type: "Identifier", name: "type", loc },
                                    args: [idExp("t", loc)],
                                    loc,
                                },
                                right: { type: "StringLiteral", value: "userdata", loc },
                                loc,
                            },
                            right: {
                                type: "BinaryExpression",
                                operator: "and",
                                left: {
                                    type: "BinaryExpression",
                                    operator: "~=",
                                    left: {
                                        type: "CallExpression",
                                        callee: { type: "Identifier", name: "typeof", loc },
                                        args: [idExp("t", loc)],
                                        loc,
                                    },
                                    right: { type: "StringLiteral", value: "userdata", loc },
                                    loc,
                                },
                                right: {
                                    type: "BinaryExpression",
                                    operator: "~=",
                                    left: {
                                        type: "CallExpression",
                                        callee: { type: "Identifier", name: "typeof", loc },
                                        args: [idExp("t", loc)],
                                        loc,
                                    },
                                    right: { type: "StringLiteral", value: "Instance", loc },
                                    loc,
                                },
                                loc,
                            },
                            loc,
                        },
                        body: [
                            { type: "ReturnStatement", values: [idExp("t", loc)], loc },
                        ],
                        loc,
                    },
                    {
                        type: "ReturnStatement",
                        values: [{
                                type: "CallExpression",
                                callee: { type: "Identifier", name: "setmetatable", loc },
                                args: [
                                    idExp("t", loc),
                                    {
                                        type: "TableConstructor",
                                        fields: [
                                            {
                                                kind: "named",
                                                name: "__newindex",
                                                value: {
                                                    type: "FunctionExpression",
                                                    params: [{ type: "Param", name: "_", variadic: false, loc }],
                                                    body: [
                                                        { type: "ReturnStatement", values: [], loc },
                                                    ],
                                                    loc,
                                                },
                                            },
                                            {
                                                kind: "named",
                                                name: "__index",
                                                value: idExp("t", loc),
                                            },
                                        ],
                                        loc,
                                    },
                                ],
                                loc,
                            }],
                        loc,
                    },
                ],
                loc,
            }],
        loc,
    };
    const wrapperTable = {
        type: "LocalStatement",
        vars: [{ name: wrapTableName, type: undefined }],
        values: [{
                type: "FunctionExpression",
                params: [{ type: "Param", name: "target", variadic: false, loc }],
                body: [
                    {
                        type: "IfStatement",
                        condition: {
                            type: "BinaryExpression",
                            operator: "or",
                            left: {
                                type: "BinaryExpression",
                                operator: "==",
                                left: {
                                    type: "CallExpression",
                                    callee: { type: "Identifier", name: "typeof", loc },
                                    args: [idExp("target", loc)],
                                    loc,
                                },
                                right: { type: "StringLiteral", value: "userdata", loc },
                                loc,
                            },
                            right: {
                                type: "BinaryExpression",
                                operator: "==",
                                left: {
                                    type: "CallExpression",
                                    callee: { type: "Identifier", name: "typeof", loc },
                                    args: [idExp("target", loc)],
                                    loc,
                                },
                                right: { type: "StringLiteral", value: "Instance", loc },
                                loc,
                            },
                            loc,
                        },
                        body: [
                            { type: "ReturnStatement", values: [idExp("target", loc)], loc },
                        ],
                        loc,
                    },
                    {
                        type: "ReturnStatement",
                        values: [{
                                type: "TableConstructor",
                                fields: [
                                    {
                                        kind: "named",
                                        name: "__index",
                                        value: {
                                            type: "FunctionExpression",
                                            params: [
                                                { type: "Param", name: "_", variadic: false, loc },
                                                { type: "Param", name: "k", variadic: false, loc },
                                            ],
                                            body: [
                                                {
                                                    type: "ReturnStatement",
                                                    values: [{
                                                            type: "IndexExpression",
                                                            object: idExp("target", loc),
                                                            index: idExp("k", loc),
                                                            loc,
                                                        }],
                                                    loc,
                                                },
                                            ],
                                            loc,
                                        },
                                    },
                                    {
                                        kind: "named",
                                        name: "__newindex",
                                        value: {
                                            type: "FunctionExpression",
                                            params: [
                                                { type: "Param", name: "_", variadic: false, loc },
                                                { type: "Param", name: "k", variadic: false, loc },
                                                { type: "Param", name: "v", variadic: false, loc },
                                            ],
                                            body: [
                                                {
                                                    type: "AssignmentStatement",
                                                    vars: [{
                                                            type: "IndexExpression",
                                                            object: idExp("target", loc),
                                                            index: idExp("k", loc),
                                                            loc,
                                                        }],
                                                    values: [idExp("v", loc)],
                                                    loc,
                                                },
                                            ],
                                            loc,
                                        },
                                    },
                                    {
                                        kind: "named",
                                        name: "__call",
                                        value: {
                                            type: "FunctionExpression",
                                            params: [
                                                { type: "Param", name: "_", variadic: false, loc },
                                                { type: "Param", name: "...", variadic: true, loc },
                                            ],
                                            body: [
                                                {
                                                    type: "ReturnStatement",
                                                    values: [{
                                                            type: "CallExpression",
                                                            callee: idExp("target", loc),
                                                            args: [{ type: "VarargExpression", loc }],
                                                            loc,
                                                        }],
                                                    loc,
                                                },
                                            ],
                                            loc,
                                        },
                                    },
                                ],
                                loc,
                            }],
                        loc,
                    },
                ],
                loc,
            }],
        loc,
    };
    const transformedBody = [...ast.body];
    return {
        ...ast,
        body: [readOnlyMetatable, wrapperTable, ...transformedBody],
    };
}
//# sourceMappingURL=MetatableProtector.js.map