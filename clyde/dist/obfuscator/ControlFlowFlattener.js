import { MBAEngine } from "./MBAExpressionEngine.js";
function makeLoc(start, end) {
    return { start, end };
}
function idExp(name, loc) {
    return { type: "Identifier", name, loc };
}
function numExp(n, loc) {
    return { type: "NumberLiteral", value: String(n), loc };
}
function assignStmt(vars, values, loc) {
    return {
        type: "AssignmentStatement",
        vars: vars.map((v) => ({ type: "Identifier", name: v.name, loc })),
        values,
        loc,
    };
}
function localNumStmt(name, value, loc) {
    return {
        type: "LocalStatement",
        vars: [{ name, type: undefined }],
        values: [numExp(value, loc)],
        loc,
    };
}
function localStmt(names, values, loc) {
    return {
        type: "LocalStatement",
        vars: names.map((n) => ({ name: n, type: undefined })),
        values,
        loc,
    };
}
function binaryExp(left, operator, right, loc) {
    return { type: "BinaryExpression", operator, left, right, loc };
}
function splitIntoBlocks(stmts) {
    const blocks = [];
    let currentBlock = [];
    let blockId = 0;
    for (const stmt of stmts) {
        const isControl = stmt.type === "IfStatement" ||
            stmt.type === "WhileStatement" ||
            stmt.type === "RepeatStatement" ||
            stmt.type === "ForNumericStatement" ||
            stmt.type === "ForInStatement" ||
            stmt.type === "DoStatement";
        const isBreak = stmt.type === "BreakStatement" ||
            stmt.type === "ReturnStatement" ||
            stmt.type === "ContinueStatement";
        if (isControl || isBreak) {
            if (currentBlock.length > 0) {
                blocks.push({ id: blockId++, body: currentBlock, isEntry: false, isExit: false });
                currentBlock = [];
            }
            blocks.push({ id: blockId++, body: [stmt], isEntry: false, isExit: isBreak });
            continue;
        }
        currentBlock.push(stmt);
    }
    if (currentBlock.length > 0) {
        blocks.push({ id: blockId++, body: currentBlock, isEntry: false, isExit: false });
    }
    if (blocks.length === 0)
        return [];
    blocks[0].isEntry = true;
    blocks[blocks.length - 1].isExit = true;
    return blocks;
}
function flattenBlocks(blocks, stateVar, engine, loc) {
    if (blocks.length <= 1) {
        return blocks.flatMap((b) => b.body);
    }
    const shuffled = [...blocks];
    for (let i = 1; i < shuffled.length; i++) {
        const j = 1 + Math.floor(engine["rng"]() * (shuffled.length - 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const stateMap = new Map();
    for (let i = 0; i < shuffled.length; i++) {
        stateMap.set(shuffled[i].id, i + 1);
    }
    const entryState = stateMap.get(blocks[0].id);
    const xorKey = 1 + Math.floor(engine["rng"]() * 65535);
    const xorKeyVar = `_x${stateVar.slice(2)}`;
    const dispatchVar = `_d${stateVar.slice(2)}`;
    const retVar = `_r${stateVar.slice(2)}`;
    const result = [];
    // XOR-obfuscated state variable
    result.push(localStmt([stateVar], [binaryExp(numExp(entryState, loc), "~", numExp(xorKey, loc), loc)], loc));
    // XOR key
    result.push(localNumStmt(xorKeyVar, xorKey, loc));
    // Return value capture
    result.push(localStmt([retVar], [{ type: "NilLiteral", loc }], loc));
    // Build dispatch table
    const dispatchFields = [];
    for (let i = 0; i < shuffled.length; i++) {
        const block = shuffled[i];
        const currentState = stateMap.get(block.id);
        const isExit = block.isExit;
        let nextState;
        if (i < shuffled.length - 1) {
            nextState = stateMap.get(shuffled[i + 1].id);
        }
        else {
            nextState = -1;
        }
        const bodyCopy = [...block.body];
        const lastStmt = bodyCopy.length > 0 ? bodyCopy[bodyCopy.length - 1] : null;
        const hasReturn = lastStmt?.type === "ReturnStatement";
        let blockBody;
        if (hasReturn) {
            const ret = lastStmt;
            bodyCopy.pop();
            blockBody = bodyCopy;
            const retValues = ret.values || [];
            if (retValues.length > 0) {
                blockBody.push(assignStmt([{ name: retVar }], [
                    {
                        type: "TableConstructor",
                        fields: retValues.map((v) => ({ kind: "value", value: v })),
                        loc,
                    },
                ], loc));
            }
            else {
                blockBody.push(assignStmt([{ name: retVar }], [{ type: "TableConstructor", fields: [], loc }], loc));
            }
        }
        else {
            blockBody = bodyCopy;
        }
        let fnBody = [...blockBody];
        // Opaque predicate inside block function
        if (engine && engine["rng"]() > 0.4) {
            const opaque = engine.createOpaquePredicate(loc);
            if (opaque.expected) {
                fnBody = [
                    {
                        type: "IfStatement",
                        condition: opaque.condition,
                        thenBody: fnBody,
                        elseifClauses: [],
                        elseBody: [
                            assignStmt([{ name: `_j${Math.floor(engine["rng"]() * 100000)}` }], [numExp(Math.floor(engine["rng"]() * 1000), loc)], loc),
                        ],
                        loc,
                    },
                ];
            }
        }
        dispatchFields.push({
            kind: "index",
            index: numExp(currentState, loc),
            value: {
                type: "TableConstructor",
                fields: [
                    {
                        kind: "named",
                        name: "fn",
                        value: {
                            type: "FunctionExpression",
                            params: [],
                            body: fnBody,
                            loc,
                        },
                    },
                    {
                        kind: "named",
                        name: "next",
                        value: numExp(nextState, loc),
                    },
                ],
                loc,
            },
        });
    }
    // Decoy dispatch entries
    const deadCount = 1 + Math.floor(engine["rng"]() * 3);
    for (let i = 0; i < deadCount; i++) {
        const deadState = shuffled.length + 2 + i;
        const fakeNext = 1 + Math.floor(engine["rng"]() * (shuffled.length + 1));
        dispatchFields.push({
            kind: "index",
            index: numExp(deadState, loc),
            value: {
                type: "TableConstructor",
                fields: [
                    {
                        kind: "named",
                        name: "fn",
                        value: {
                            type: "FunctionExpression",
                            params: [],
                            body: [
                                assignStmt([{ name: `_j${Math.floor(engine["rng"]() * 100000)}` }], [numExp(Math.floor(engine["rng"]() * 1000), loc)], loc),
                            ],
                            loc,
                        },
                    },
                    {
                        kind: "named",
                        name: "next",
                        value: numExp(fakeNext, loc),
                    },
                ],
                loc,
            },
        });
    }
    // Dispatch table local
    result.push(localStmt([dispatchVar], [{ type: "TableConstructor", fields: dispatchFields, loc }], loc));
    // While loop
    const tempVar = `_b${stateVar.slice(2)}`;
    const whileCond = binaryExp(binaryExp(idExp(stateVar, loc), "~", idExp(xorKeyVar, loc), loc), "~=", numExp(-1, loc), loc);
    result.push({
        type: "WhileStatement",
        condition: whileCond,
        body: [
            localStmt([tempVar], [
                {
                    type: "IndexExpression",
                    object: idExp(dispatchVar, loc),
                    index: binaryExp(idExp(stateVar, loc), "~", idExp(xorKeyVar, loc), loc),
                    loc,
                },
            ], loc),
            {
                type: "FunctionCallStatement",
                call: {
                    type: "CallExpression",
                    callee: {
                        type: "MemberExpression",
                        object: idExp(tempVar, loc),
                        property: "fn",
                        loc,
                    },
                    args: [],
                    loc,
                },
                loc,
            },
            assignStmt([{ name: stateVar }], [
                binaryExp({
                    type: "MemberExpression",
                    object: idExp(tempVar, loc),
                    property: "next",
                    loc,
                }, "~", idExp(xorKeyVar, loc), loc),
            ], loc),
        ],
        loc,
    });
    // Post-loop return
    result.push({
        type: "IfStatement",
        condition: binaryExp(idExp(retVar, loc), "~=", { type: "NilLiteral", loc }, loc),
        thenBody: [
            {
                type: "ReturnStatement",
                values: [
                    {
                        type: "CallExpression",
                        callee: {
                            type: "MemberExpression",
                            object: { type: "Identifier", name: "table", loc },
                            property: "unpack",
                            loc,
                        },
                        args: [idExp(retVar, loc)],
                        loc,
                    },
                ],
                loc,
            },
        ],
        elseifClauses: [],
        loc,
    });
    return result;
}
function flattenFunctionBody(body, stateVar, engine, loc) {
    const blocks = splitIntoBlocks(body);
    if (blocks.length <= 1)
        return body;
    return flattenBlocks(blocks, stateVar, engine, loc);
}
function transformStatement(stmt, stateCounter, engine) {
    switch (stmt.type) {
        case "LocalFunctionStatement": {
            const stateVar = `_s${stateCounter.value++}`;
            return {
                ...stmt,
                body: flattenFunctionBody(stmt.body, stateVar, engine, stmt.loc),
            };
        }
        case "FunctionStatement":
        case "TypeFunctionStatement":
        case "ExportTypeFunctionStatement": {
            const stateVar = `_s${stateCounter.value++}`;
            return {
                ...stmt,
                body: flattenFunctionBody(stmt.body, stateVar, engine, stmt.loc),
            };
        }
        case "DoStatement":
            return { ...stmt, body: stmt.body.map((s) => transformStatement(s, stateCounter, engine)) };
        case "IfStatement":
            return {
                ...stmt,
                thenBody: stmt.thenBody.map((s) => transformStatement(s, stateCounter, engine)),
                elseifClauses: stmt.elseifClauses.map((c) => ({
                    ...c,
                    body: c.body.map((s) => transformStatement(s, stateCounter, engine)),
                })),
                elseBody: stmt.elseBody?.map((s) => transformStatement(s, stateCounter, engine)),
            };
        case "WhileStatement":
            return {
                ...stmt,
                body: stmt.body.map((s) => transformStatement(s, stateCounter, engine)),
            };
        case "RepeatStatement":
            return {
                ...stmt,
                body: stmt.body.map((s) => transformStatement(s, stateCounter, engine)),
            };
        case "ForNumericStatement":
            return {
                ...stmt,
                body: stmt.body.map((s) => transformStatement(s, stateCounter, engine)),
            };
        case "ForInStatement":
            return {
                ...stmt,
                body: stmt.body.map((s) => transformStatement(s, stateCounter, engine)),
            };
        default:
            return stmt;
    }
}
export function flattenControlFlow(ast, options = {}) {
    const enabled = options.enabled !== false;
    if (!enabled)
        return ast;
    const seed = options.seed ?? 0;
    const engine = options.opaquePredicates !== false ? new MBAEngine({ seed }) : null;
    const stateCounter = { value: seed * 100 };
    return {
        ...ast,
        body: ast.body.map((s) => transformStatement(s, stateCounter, engine)),
    };
}
//# sourceMappingURL=ControlFlowFlattener.js.map