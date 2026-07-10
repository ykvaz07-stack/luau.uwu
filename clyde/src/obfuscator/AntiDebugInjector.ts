import type { Chunk, Statement, LastStatement, Expression } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";

export interface AntiDebugInjectorOptions {
  enabled?: boolean;
  seed?: number;
  intensity?: number;
}

function makeLoc(start: SourceLocation["start"], end: SourceLocation["end"]): SourceLocation {
  return { start, end };
}

function idExp(name: string, loc: SourceLocation): Expression {
  return { type: "Identifier", name, loc };
}

function numExp(n: number, loc: SourceLocation): Expression {
  return { type: "NumberLiteral", value: String(n), loc };
}

function strExp(s: string, loc: SourceLocation): Expression {
  return { type: "StringLiteral", value: s, loc };
}

function binExp(left: Expression, op: string, right: Expression, loc: SourceLocation): Expression {
  return { type: "BinaryExpression", operator: op, left, right, loc };
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function injectAntiDebugStatements(loc: SourceLocation, rng: () => number, intensity: number): Statement[] {
  const stmts: Statement[] = [];
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
        callee: {
          type: "MemberExpression",
          object: idExp("pcall", loc),
          property: undefined as any,
          loc,
        },
        args: [{
          type: "FunctionExpression",
          params: [],
          body: [
            {
              type: "AssignmentStatement",
              vars: [{ type: "Identifier", name: guardVar, loc } as any],
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

export function injectAntiDebug(ast: Chunk, options: AntiDebugInjectorOptions = {}): Chunk {
  const enabled = options.enabled !== false;
  if (!enabled) return ast;

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
