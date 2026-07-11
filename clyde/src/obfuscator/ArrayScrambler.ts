import type { Chunk, Statement, LastStatement, Expression, Var, TableConstructor, TableField } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";

export interface ArrayScramblerOptions {
  enabled?: boolean;
  seed?: number;
  minFields?: number;
}

const ZERO_LOC: SourceLocation = {
  start: { line: 0, column: 0, offset: 0 },
  end: { line: 0, column: 0, offset: 0 },
};

function id(name: string): Expression {
  return { type: "Identifier", name, loc: ZERO_LOC };
}

function strLit(s: string): Expression {
  return { type: "StringLiteral", value: s, loc: ZERO_LOC };
}

function numLit(n: number): Expression {
  return { type: "NumberLiteral", value: String(n), loc: ZERO_LOC };
}

function unary(op: string, arg: Expression): Expression {
  return { type: "UnaryExpression", operator: op, argument: arg, loc: ZERO_LOC };
}

function binary(op: string, left: Expression, right: Expression): Expression {
  return { type: "BinaryExpression", operator: op, left, right, loc: ZERO_LOC };
}

function indexExp(obj: Expression, idx: Expression): Expression {
  return { type: "IndexExpression", object: obj, index: idx, loc: ZERO_LOC };
}

function tableCons(fields: TableField[]): TableConstructor {
  return { type: "TableConstructor", fields, loc: ZERO_LOC };
}

function assignStmt(vars: Var[], values: Expression[]): Statement {
  return { type: "AssignmentStatement", vars, values, loc: ZERO_LOC };
}

function localStmt(names: string[], values?: Expression[]): Statement {
  return {
    type: "LocalStatement",
    vars: names.map(n => ({ name: n })),
    values,
    loc: ZERO_LOC,
  };
}

function doStmt(body: (Statement | LastStatement)[]): Statement {
  return { type: "DoStatement", body, loc: ZERO_LOC };
}

function returnStmt(values?: Expression[]): LastStatement {
  return { type: "ReturnStatement", values, loc: ZERO_LOC };
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function fieldToAppendStmt(tableName: string, field: TableField): Statement {
  switch (field.kind) {
    case "value":
      return assignStmt(
        [indexExp(id(tableName), binary("+", unary("#", id(tableName)), numLit(1))) as Var],
        [field.value]
      );
    case "named":
      return assignStmt(
        [indexExp(id(tableName), strLit(field.name)) as Var],
        [field.value]
      );
    case "index":
      return assignStmt(
        [indexExp(id(tableName), field.index) as Var],
        [field.value]
      );
  }
}

function buildInitialTable(fields: TableField[]): { table: TableConstructor; remainingFields: TableField[] } {
  const firstValueIdx = fields.findIndex(f => f.kind === "value");
  if (firstValueIdx >= 0) {
    const head = fields[firstValueIdx];
    const remaining = fields.filter((_, i) => i !== firstValueIdx);
    return { table: tableCons([head]), remainingFields: remaining };
  }
  return { table: tableCons([]), remainingFields: [...fields] };
}

function shouldScramble(tc: TableConstructor, minFields: number): boolean {
  return tc.fields.length >= minFields;
}

function buildTablePrologue(tc: TableConstructor, tempName: string, rng: () => number, minFields: number): Statement[] {
  const { table, remainingFields } = buildInitialTable(tc.fields);
  const scrambled = shuffleArray(remainingFields, rng);
  return [
    localStmt([tempName], [table]),
    ...scrambled.map(f => fieldToAppendStmt(tempName, f)),
  ];
}

function buildTableIIFE(tc: TableConstructor, tempName: string, rng: () => number, minFields: number): Expression {
  const prologue = buildTablePrologue(tc, tempName, rng, minFields);
  return {
    type: "CallExpression",
    callee: {
      type: "FunctionExpression",
      params: [],
      body: [...prologue, returnStmt([id(tempName)])],
      loc: ZERO_LOC,
    } as any,
    args: [],
    loc: ZERO_LOC,
  };
}

function transformExpression(
  exp: Expression,
  rng: () => number,
  minFields: number,
  counter: { n: number }
): Expression {
  if (exp.type === "TableConstructor" && shouldScramble(exp, minFields)) {
    const tempName = "_as" + counter.n++;
    return buildTableIIFE(exp, tempName, rng, minFields);
  }

  switch (exp.type) {
    case "BinaryExpression":
      return {
        ...exp,
        left: transformExpression(exp.left, rng, minFields, counter),
        right: transformExpression(exp.right, rng, minFields, counter),
      };
    case "UnaryExpression":
      return { ...exp, argument: transformExpression(exp.argument, rng, minFields, counter) };
    case "CallExpression":
      return {
        ...exp,
        callee: transformExpression(exp.callee, rng, minFields, counter),
        args: exp.args.map(a => transformExpression(a, rng, minFields, counter)),
      };
    case "MethodCallExpression":
      return {
        ...exp,
        object: transformExpression(exp.object, rng, minFields, counter),
        args: exp.args.map(a => transformExpression(a, rng, minFields, counter)),
      };
    case "IndexExpression":
      return {
        ...exp,
        object: transformExpression(exp.object, rng, minFields, counter),
        index: transformExpression(exp.index, rng, minFields, counter),
      };
    case "MemberExpression":
      return { ...exp, object: transformExpression(exp.object, rng, minFields, counter) };
    case "FunctionExpression":
      return {
        ...exp,
        body: exp.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
      };
    case "ParenExpression":
      return { ...exp, expression: transformExpression(exp.expression, rng, minFields, counter) };
    case "TypeAssertion":
      return { ...exp, expression: transformExpression(exp.expression, rng, minFields, counter) };
    case "IfElseExpression":
      return {
        ...exp,
        condition: transformExpression(exp.condition, rng, minFields, counter),
        thenExp: transformExpression(exp.thenExp, rng, minFields, counter),
        elseifClauses: exp.elseifClauses.map(c => ({
          ...c,
          condition: transformExpression(c.condition, rng, minFields, counter),
          value: transformExpression(c.value, rng, minFields, counter),
        })),
        elseExp: transformExpression(exp.elseExp, rng, minFields, counter),
      };
    case "StringInterpolation":
      return {
        ...exp,
        parts: exp.parts.map(p => (typeof p === "string" ? p : transformExpression(p, rng, minFields, counter))),
      };
    default:
      return exp;
  }
}

function transformStatement(
  stmt: Statement | LastStatement,
  rng: () => number,
  minFields: number,
  counter: { n: number }
): (Statement | LastStatement)[] {
  switch (stmt.type) {
    case "LocalStatement": {
      const values = stmt.values;
      if (values && values.length === 1 && values[0].type === "TableConstructor") {
        const tc = values[0];
        if (shouldScramble(tc, minFields) && stmt.vars.length === 1) {
          const varName = stmt.vars[0].name;
          const { table, remainingFields } = buildInitialTable(tc.fields);
          const scrambled = shuffleArray(remainingFields, rng);
          return [
            { ...stmt, values: [table] },
            ...scrambled.map(f => fieldToAppendStmt(varName, f)),
          ];
        }
      }
      return [
        {
          ...stmt,
          values: values?.map(v => transformExpression(v, rng, minFields, counter)),
        },
      ];
    }

    case "AssignmentStatement": {
      if (stmt.values.length === 1 && stmt.values[0].type === "TableConstructor" && stmt.vars.length === 1) {
        const tc = stmt.values[0] as TableConstructor;
        if (shouldScramble(tc, minFields) && stmt.vars[0].type === "Identifier") {
          const varName = stmt.vars[0].name;
          const { table, remainingFields } = buildInitialTable(tc.fields);
          const scrambled = shuffleArray(remainingFields, rng);
          return [
            { ...stmt, values: [table] },
            ...scrambled.map(f => fieldToAppendStmt(varName, f)),
          ];
        }
      }
      return [
        {
          ...stmt,
          vars: stmt.vars.map(v => {
            if (v.type === "Identifier") return v;
            if (v.type === "IndexExpression")
              return {
                ...v,
                object: transformExpression(v.object, rng, minFields, counter),
                index: transformExpression(v.index, rng, minFields, counter),
              };
            return { ...v, object: transformExpression(v.object, rng, minFields, counter) };
          }),
          values: stmt.values.map(v => transformExpression(v, rng, minFields, counter)),
        },
      ];
    }

    case "CompoundAssignmentStatement":
      return [
        {
          ...stmt,
          var: stmt.var.type === "Identifier" ? stmt.var : {
            ...stmt.var,
            object: transformExpression(stmt.var.object, rng, minFields, counter),
            ...(stmt.var.type === "IndexExpression" && { index: transformExpression(stmt.var.index, rng, minFields, counter) }),
          } as any,
          value: transformExpression(stmt.value, rng, minFields, counter),
        },
      ];

    case "FunctionCallStatement":
      return [{ ...stmt, call: transformExpression(stmt.call, rng, minFields, counter) as any }];

    case "ReturnStatement":
      return [{ ...stmt, values: stmt.values?.map(v => transformExpression(v, rng, minFields, counter)) }];

    case "IfStatement":
      return [{
        ...stmt,
        condition: transformExpression(stmt.condition, rng, minFields, counter),
        thenBody: stmt.thenBody.flatMap(s => transformStatement(s, rng, minFields, counter)),
        elseifClauses: stmt.elseifClauses.map(c => ({
          ...c,
          condition: transformExpression(c.condition, rng, minFields, counter),
          body: c.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
        })),
        elseBody: stmt.elseBody?.flatMap(s => transformStatement(s, rng, minFields, counter)),
      }];

    case "WhileStatement":
      return [{
        ...stmt,
        condition: transformExpression(stmt.condition, rng, minFields, counter),
        body: stmt.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
      }];

    case "RepeatStatement":
      return [{
        ...stmt,
        body: stmt.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
        condition: transformExpression(stmt.condition, rng, minFields, counter),
      }];

    case "DoStatement":
      return [{
        ...stmt,
        body: stmt.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
      }];

    case "ForNumericStatement":
      return [{
        ...stmt,
        start: transformExpression(stmt.start, rng, minFields, counter),
        end: transformExpression(stmt.end, rng, minFields, counter),
        step: stmt.step ? transformExpression(stmt.step, rng, minFields, counter) : undefined,
        body: stmt.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
      }];

    case "ForInStatement":
      return [{
        ...stmt,
        iter: stmt.iter.map(e => transformExpression(e, rng, minFields, counter)),
        body: stmt.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
      }];

    case "LocalFunctionStatement":
    case "FunctionStatement":
      return [{
        ...stmt,
        body: stmt.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
      }];

    case "TypeFunctionStatement":
    case "ExportTypeFunctionStatement":
      return [{
        ...stmt,
        body: stmt.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
      }];

    default:
      return [stmt];
  }
}

export function scrambleArrays(ast: Chunk, options: ArrayScramblerOptions = {}): Chunk {
  const enabled = options.enabled !== false;
  if (!enabled) return ast;

  const seed = options.seed ?? 0;
  const minFields = options.minFields ?? 4;
  const rng = createRng(seed);
  const counter = { n: 0 };

  return {
    ...ast,
    body: ast.body.flatMap(s => transformStatement(s, rng, minFields, counter)),
  };
}
