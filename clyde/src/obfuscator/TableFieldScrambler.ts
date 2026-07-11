import type { Chunk, Statement, LastStatement, Expression, TableConstructor } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";

export interface TableFieldScramblerOptions {
  enabled?: boolean;
  seed?: number;
  addFakeFields?: boolean;
}

function makeLoc(start: SourceLocation["start"], end: SourceLocation["end"]): SourceLocation {
  return { start, end };
}

function numExp(n: number, loc: SourceLocation): Expression {
  return { type: "NumberLiteral", value: String(n), loc };
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function scrambleTable(t: TableConstructor, rng: () => number, addFake: boolean): TableConstructor {
  if (t.fields.length <= 1) return t;

  const fields = [...t.fields];

  for (let i = fields.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [fields[i], fields[j]] = [fields[j], fields[i]];
  }

  if (addFake && rng() > 0.5) {
    const fakeKey = Math.floor(rng() * 10000) + 10000;
    const fakeField = {
      kind: "index" as const,
      index: numExp(fakeKey, t.loc),
      value: { type: "NilLiteral", loc: t.loc } as Expression,
    };
    const insertPos = Math.floor(rng() * (fields.length + 1));
    fields.splice(insertPos, 0, fakeField);
  }

  return { ...t, fields };
}

function transformExpression(exp: Expression, rng: () => number, addFake: boolean): Expression {
  if (exp.type === "TableConstructor") {
    return scrambleTable(exp, rng, addFake);
  }
  if (exp.type === "BinaryExpression") {
    return {
      ...exp,
      left: transformExpression(exp.left, rng, addFake),
      right: transformExpression(exp.right, rng, addFake),
    };
  }
  if (exp.type === "UnaryExpression") {
    return { ...exp, argument: transformExpression(exp.argument, rng, addFake) };
  }
  if (exp.type === "CallExpression") {
    return {
      ...exp,
      callee: transformExpression(exp.callee, rng, addFake),
      args: exp.args.map((a) => transformExpression(a, rng, addFake)),
    };
  }
  if (exp.type === "MethodCallExpression") {
    return {
      ...exp,
      object: transformExpression(exp.object, rng, addFake),
      args: exp.args.map((a) => transformExpression(a, rng, addFake)),
    };
  }
  if (exp.type === "IndexExpression") {
    return {
      ...exp,
      object: transformExpression(exp.object, rng, addFake),
      index: transformExpression(exp.index, rng, addFake),
    };
  }
  if (exp.type === "MemberExpression") {
    return { ...exp, object: transformExpression(exp.object, rng, addFake) };
  }
  if (exp.type === "FunctionExpression") {
    return {
      ...exp,
      body: exp.body.map((s) => transformStatement(s, rng, addFake)),
    };
  }
  if (exp.type === "ParenExpression") {
    return { ...exp, expression: transformExpression(exp.expression, rng, addFake) };
  }
  if (exp.type === "TypeAssertion") {
    return { ...exp, expression: transformExpression(exp.expression, rng, addFake) };
  }
  if (exp.type === "IfElseExpression") {
    return {
      ...exp,
      condition: transformExpression(exp.condition, rng, addFake),
      thenExp: transformExpression(exp.thenExp, rng, addFake),
      elseifClauses: exp.elseifClauses.map((c) => ({
        ...c,
        condition: transformExpression(c.condition, rng, addFake),
        value: transformExpression(c.value, rng, addFake),
      })),
      elseExp: transformExpression(exp.elseExp, rng, addFake),
    };
  }
  if (exp.type === "StringInterpolation") {
    return {
      ...exp,
      parts: exp.parts.map((p) =>
        typeof p === "string" ? p : transformExpression(p, rng, addFake)
      ),
    };
  }
  return exp;
}

function transformStatement(stmt: Statement | LastStatement, rng: () => number, addFake: boolean): Statement | LastStatement {
  switch (stmt.type) {
    case "LocalStatement":
      return {
        ...stmt,
        values: stmt.values?.map((e) => transformExpression(e, rng, addFake)),
      };
    case "AssignmentStatement":
      return {
        ...stmt,
        vars: stmt.vars.map((v) => {
          if (v.type === "Identifier") return v;
          if (v.type === "IndexExpression")
            return { ...v, object: transformExpression(v.object, rng, addFake), index: transformExpression(v.index, rng, addFake) };
          return { ...v, object: transformExpression(v.object, rng, addFake) };
        }),
        values: stmt.values.map((e) => transformExpression(e, rng, addFake)),
      };
    case "CompoundAssignmentStatement":
      return {
        ...stmt,
        var: stmt.var.type === "Identifier" ? stmt.var : {
          ...stmt.var,
          object: transformExpression(stmt.var.object, rng, addFake),
          ...(stmt.var.type === "IndexExpression" && { index: transformExpression(stmt.var.index, rng, addFake) }),
        },
        value: transformExpression(stmt.value, rng, addFake),
      };
    case "FunctionCallStatement":
      return { ...stmt, call: transformExpression(stmt.call, rng, addFake) as any };
    case "ReturnStatement":
      return { ...stmt, values: stmt.values?.map((e) => transformExpression(e, rng, addFake)) };
    case "IfStatement":
      return {
        ...stmt,
        condition: transformExpression(stmt.condition, rng, addFake),
        thenBody: stmt.thenBody.map((s) => transformStatement(s, rng, addFake)),
        elseifClauses: stmt.elseifClauses?.map((c) => ({
          ...c,
          condition: transformExpression(c.condition, rng, addFake),
          body: c.body.map((s) => transformStatement(s, rng, addFake)),
        })),
        elseBody: stmt.elseBody?.map((s) => transformStatement(s, rng, addFake)),
      };
    case "ForNumericStatement":
      return {
        ...stmt,
        start: transformExpression(stmt.start, rng, addFake),
        end: transformExpression(stmt.end, rng, addFake),
        step: stmt.step ? transformExpression(stmt.step, rng, addFake) : undefined,
        body: stmt.body.map((s) => transformStatement(s, rng, addFake)),
      };
    case "ForInStatement":
      return {
        ...stmt,
        iter: stmt.iter.map((e) => transformExpression(e, rng, addFake)),
        body: stmt.body.map((s) => transformStatement(s, rng, addFake)),
      };
    case "LocalFunctionStatement":
    case "FunctionStatement":
    case "TypeFunctionStatement":
    case "ExportTypeFunctionStatement":
      return {
        ...stmt,
        body: stmt.body.map((s) => transformStatement(s, rng, addFake)),
      };
    case "DoStatement":
    case "WhileStatement":
    case "RepeatStatement":
      return {
        ...stmt,
        ...(stmt.type === "WhileStatement" && { condition: transformExpression(stmt.condition, rng, addFake) }),
        ...(stmt.type === "RepeatStatement" && { condition: transformExpression(stmt.condition, rng, addFake) }),
        body: stmt.body.map((s) => transformStatement(s, rng, addFake)),
      };
    default:
      return stmt;
  }
}

export function scrambleTableFields(ast: Chunk, options: TableFieldScramblerOptions = {}): Chunk {
  const enabled = options.enabled !== false;
  if (!enabled) return ast;

  const seed = options.seed ?? 0;
  const rng = createRng(seed);
  const addFake = options.addFakeFields !== false;

  return {
    ...ast,
    body: ast.body.map((s) => transformStatement(s, rng, addFake)),
  };
}
