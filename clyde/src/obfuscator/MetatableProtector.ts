import type { Chunk, Statement, LastStatement, Expression } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";

export interface MetatableProtectorOptions {
  enabled?: boolean;
  seed?: number;
  protectGlobals?: boolean;
}

function makeLoc(start: SourceLocation["start"], end: SourceLocation["end"]): SourceLocation {
  return { start, end };
}

function idExp(name: string, loc: SourceLocation): Expression {
  return { type: "Identifier", name, loc };
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function protectWithMetatables(ast: Chunk, options: MetatableProtectorOptions = {}): Chunk {
  const enabled = options.enabled !== false;
  if (!enabled) return ast;

  const seed = options.seed ?? 0;
  const rng = createRng(seed);
  const protectGlobal = options.protectGlobals ?? true;
  const loc = ast.body[0]?.loc ?? { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };

  const readOnlyTableName = `_mt_ro_${Math.floor(rng() * 100000)}`;
  const wrapTableName = `_mt_wrap_${Math.floor(rng() * 100000)}`;

  const readOnlyMetatable: Statement = {
    type: "LocalStatement",
    vars: [{ name: readOnlyTableName, type: undefined }],
    values: [{
      type: "FunctionExpression",
      params: [{ type: "Param", name: "t", variadic: false, loc }],
      body: [
        {
          type: "ReturnStatement",
          values: [{
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
              } as any,
              {
                kind: "named",
                name: "__index",
                value: idExp("t", loc),
              } as any,
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

  const wrapperTable: Statement = {
    type: "LocalStatement",
    vars: [{ name: wrapTableName, type: undefined }],
    values: [{
      type: "FunctionExpression",
      params: [{ type: "Param", name: "target", variadic: false, loc }],
      body: [
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
              } as any,
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
              } as any,
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
              } as any,
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

  const protectAssignCall = `setmetatable(rawget(_G, "print"), ${readOnlyTableName}(rawget(_G, "print")));`;

  const transformedBody: (Statement | LastStatement)[] = [...ast.body];

  if (protectGlobal) {
    const protectGlobalsCall: Statement = {
      type: "DoStatement",
      body: [
        {
          type: "AssignmentStatement",
          vars: [{ type: "Identifier", name: readOnlyTableName, loc }] as any,
          values: [idExp(readOnlyTableName, loc)],
          loc,
        },
      ],
      loc,
    };
  }

  return {
    ...ast,
    body: [readOnlyMetatable, wrapperTable, ...transformedBody],
  };
}
