import type { Chunk, Statement, LastStatement, Expression } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";

export interface DeadCodeInjectorOptions {
  enabled?: boolean;
  density?: number;
  seed?: number;
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

interface JunkTemplate {
  generate: (rng: () => number, loc: SourceLocation, usedVars: string[]) => Statement | LastStatement;
}

const junkTemplates: JunkTemplate[] = [
  {
    generate: (rng, loc, usedVars) => {
      const a = Math.floor(rng() * 1000);
      const b = Math.floor(rng() * 1000);
      const target = a + b;
      return {
        type: "LocalStatement",
        vars: [{ name: `_j${Math.floor(rng() * 100000)}`, type: undefined }],
        values: [{
          type: "BinaryExpression",
          operator: "==",
          left: { type: "BinaryExpression", operator: "+", left: numExp(a, loc), right: numExp(b, loc), loc },
          right: numExp(target, loc),
          loc,
        }],
        loc,
      };
    },
  },
  {
    generate: (rng, loc) => {
      const a = Math.floor(rng() * 500);
      return {
        type: "LocalStatement",
        vars: [{ name: `_j${Math.floor(rng() * 100000)}`, type: undefined }],
        values: [{
          type: "CallExpression",
          callee: { type: "MemberExpression", object: idExp("string", loc), property: "rep", loc },
          args: [strExp(String.fromCharCode(65 + Math.floor(rng() * 26)), loc), numExp(Math.floor(rng() * 10), loc)],
          loc,
        }],
        loc,
      };
    },
  },
  {
    generate: (rng, loc, usedVars) => {
      if (usedVars.length < 2) return { type: "DoStatement", body: [], loc };
      const v1 = usedVars[Math.floor(rng() * usedVars.length)];
      const v2 = usedVars[Math.floor(rng() * usedVars.length)];
      return {
        type: "AssignmentStatement",
        vars: [{ type: "Identifier", name: v1, loc } as any],
        values: [{
          type: "BinaryExpression",
          operator: "+",
          left: idExp(v1, loc),
          right: idExp(v2, loc),
          loc,
        }],
        loc,
      };
    },
  },
  {
    generate: (rng, loc) => {
      const a = Math.floor(rng() * 100);
      const b = Math.floor(rng() * 100);
      return {
        type: "LocalStatement",
        vars: [{ name: `_j${Math.floor(rng() * 100000)}`, type: undefined }],
        values: [{
          type: "BinaryExpression",
          operator: "~",
          left: { type: "BinaryExpression", operator: "+", left: numExp(a, loc), right: numExp(b, loc), loc },
          right: numExp(a ^ b, loc),
          loc,
        }],
        loc,
      };
    },
  },
  {
    generate: (rng, loc) => {
      return {
        type: "DoStatement",
        body: [
          {
            type: "LocalStatement",
            vars: [{ name: `_j${Math.floor(rng() * 100000)}`, type: undefined }],
            values: [],
            loc,
          },
        ],
        loc,
      };
    },
  },
  {
    generate: (rng, loc) => {
      return {
        type: "WhileStatement",
        condition: { type: "BooleanLiteral", value: false, loc },
        body: [{
          type: "BreakStatement",
          loc,
        }],
        loc,
      };
    },
  },
  {
    generate: (rng, loc, usedVars) => {
      const dummyVar = `_j${Math.floor(rng() * 100000)}`;
      return {
        type: "IfStatement",
        condition: { type: "BooleanLiteral", value: false, loc },
        thenBody: [
          {
            type: "LocalStatement",
            vars: [{ name: dummyVar, type: undefined }],
            values: [strExp("dead", loc)],
            loc,
          },
        ],
        elseifClauses: [],
        loc,
      };
    },
  },
];

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function collectUsedVars(body: (Statement | LastStatement)[]): string[] {
  const vars: string[] = [];
  for (const stmt of body) {
    if (stmt.type === "LocalStatement" && stmt.vars) {
      for (const v of stmt.vars) vars.push(v.name);
    }
    if (stmt.type === "LocalFunctionStatement") vars.push(stmt.name);
    if ("body" in stmt && Array.isArray((stmt as any).body)) {
      vars.push(...collectUsedVars((stmt as any).body));
    }
  }
  return vars;
}

function injectDeadCode(
  body: (Statement | LastStatement)[],
  density: number,
  rng: () => number,
  depth: number
): (Statement | LastStatement)[] {
  if (depth > 5 || body.length === 0) return body;
  const result: (Statement | LastStatement)[] = [];
  const usedVars = collectUsedVars(body);

  for (const stmt of body) {
    if (rng() < density && junkTemplates.length > 0) {
      const template = junkTemplates[Math.floor(rng() * junkTemplates.length)];
      const junk = template.generate(rng, stmt.loc, usedVars);
      if (junk.type !== "DoStatement" || (junk as any).body.length > 0) {
        result.push(junk);
      }
    }

    if ("body" in stmt && Array.isArray((stmt as any).body)) {
      const s = stmt as any;
      result.push({
        ...s,
        body: injectDeadCode(s.body, density * 0.5, rng, depth + 1),
      });
    } else if ("thenBody" in stmt) {
      const s = stmt as any;
      result.push({
        ...s,
        thenBody: injectDeadCode(s.thenBody, density * 0.5, rng, depth + 1),
        elseifClauses: s.elseifClauses?.map((c: any) => ({
          ...c,
          body: injectDeadCode(c.body, density * 0.5, rng, depth + 1),
        })),
        elseBody: s.elseBody ? injectDeadCode(s.elseBody, density * 0.5, rng, depth + 1) : undefined,
      });
    } else {
      result.push(stmt);
    }
  }

  return result;
}

export function injectDeadCodePass(ast: Chunk, options: DeadCodeInjectorOptions = {}): Chunk {
  const enabled = options.enabled !== false;
  if (!enabled) return ast;

  const density = Math.min(1, Math.max(0, options.density ?? 0.15));
  const seed = options.seed ?? 0;
  const rng = createRng(seed);

  return {
    ...ast,
    body: injectDeadCode(ast.body, density, rng, 0) as (Statement | LastStatement)[],
  };
}
