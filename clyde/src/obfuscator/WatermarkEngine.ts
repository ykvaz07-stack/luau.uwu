import type { Chunk, Statement, LastStatement, Expression } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";

export interface WatermarkEngineOptions {
  enabled?: boolean;
  watermark?: string;
  seed?: number;
}

function makeLoc(start: SourceLocation["start"], end: SourceLocation["end"]): SourceLocation {
  return { start, end };
}

function numExp(n: number, loc: SourceLocation): Expression {
  return { type: "NumberLiteral", value: String(n), loc };
}

function strExp(s: string, loc: SourceLocation): Expression {
  return { type: "StringLiteral", value: s, loc };
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function embedWatermark(ast: Chunk, options: WatermarkEngineOptions = {}): Chunk {
  const enabled = options.enabled !== false;
  if (!enabled) return ast;

  const watermark = options.watermark ?? "uwu.dll";
  const seed = options.seed ?? 0;
  const rng = createRng(seed);
  const loc = ast.body[0]?.loc ?? { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };

  const encodedBytes: number[] = [];
  for (let i = 0; i < watermark.length; i++) {
    encodedBytes.push(watermark.charCodeAt(i) ^ 0x5A);
  }

  const guardVar = `_wm${Math.floor(rng() * 100000)}`;

  const watermarkTableStmt: Statement = {
    type: "LocalStatement",
    vars: [{ name: guardVar, type: undefined }],
    values: [{
      type: "TableConstructor",
      fields: encodedBytes.map((b) => ({
        kind: "index" as const,
        index: numExp(encodedBytes.indexOf(b) + 1, loc),
        value: numExp(b, loc),
      })),
      loc,
    }],
    loc,
  };

  const watermarkDecoderStmt: Statement = {
    type: "LocalStatement",
    vars: [{ name: `_wd${Math.floor(rng() * 100000)}`, type: undefined }],
    values: [{
      type: "FunctionExpression",
      params: [
        { type: "Param", name: "t", variadic: false, loc },
        { type: "Param", name: "k", variadic: false, loc },
      ],
      body: [
        {
          type: "LocalStatement",
          vars: [{ name: "r", type: undefined }],
          values: [{ type: "TableConstructor", fields: [], loc }],
          loc,
        },
        {
          type: "ForNumericStatement",
          var: { type: "Identifier", name: "i", loc },
          start: numExp(1, loc),
          end: {
            type: "UnaryExpression",
            operator: "#",
            argument: { type: "Identifier", name: "t", loc },
            loc,
          },
          body: [
            {
              type: "AssignmentStatement",
              vars: [{
                type: "IndexExpression",
                object: { type: "Identifier", name: "r", loc },
                index: { type: "Identifier", name: "i", loc },
                loc,
              }],
              values: [{
                type: "CallExpression",
                callee: {
                  type: "MemberExpression",
                  object: { type: "Identifier", name: "string", loc },
                  property: "char",
                  loc,
                },
                args: [{
                  type: "BinaryExpression",
                  operator: "~",
                  left: {
                    type: "IndexExpression",
                    object: { type: "Identifier", name: "t", loc },
                    index: { type: "Identifier", name: "i", loc },
                    loc,
                  },
                  right: numExp(0x5A, loc),
                  loc,
                }],
                loc,
              }],
              loc,
            },
          ],
          loc,
        },
        {
          type: "ReturnStatement",
          values: [{
            type: "CallExpression",
            callee: {
              type: "MemberExpression",
              object: { type: "Identifier", name: "table", loc },
              property: "concat",
              loc,
            },
            args: [{ type: "Identifier", name: "r", loc }],
            loc,
          }],
          loc,
        },
      ],
      loc,
    }],
    loc,
  };

  return {
    ...ast,
    body: [watermarkTableStmt, watermarkDecoderStmt, ...ast.body],
  };
}
