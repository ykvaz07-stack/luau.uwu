import type { Chunk, Statement, LastStatement, Expression } from "../ast/types.js";

export interface PerformanceOptimizerOptions {
  enabled?: boolean;
  seed?: number;
  constantFolding?: boolean;
  deadStoreElimination?: boolean;
  strengthReduction?: boolean;
  gcOptimizations?: boolean;
  level?: 1 | 2 | 3;
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hasSideEffects(expr: Expression): boolean {
  switch (expr.type) {
    case "CallExpression":
    case "MethodCallExpression":
      return true;
    case "FunctionExpression":
      return false;
    case "BinaryExpression":
      return hasSideEffects(expr.left) || hasSideEffects(expr.right);
    case "UnaryExpression":
      return hasSideEffects(expr.argument);
    case "IndexExpression":
      return hasSideEffects(expr.object) || hasSideEffects(expr.index);
    case "MemberExpression":
      return hasSideEffects(expr.object);
    case "TableConstructor":
      return expr.fields.some(f => {
        if (f.kind === "index" && hasSideEffects(f.index)) return true;
        return hasSideEffects(f.value);
      });
    case "ParenExpression":
      return hasSideEffects(expr.expression);
    case "TypeAssertion":
      return hasSideEffects(expr.expression);
    case "IfElseExpression":
      return hasSideEffects(expr.condition) || hasSideEffects(expr.thenExp) ||
        expr.elseifClauses.some(c => hasSideEffects(c.condition) || hasSideEffects(c.value)) ||
        hasSideEffects(expr.elseExp);
    case "StringInterpolation":
      return expr.parts.some(p => typeof p !== "string" && hasSideEffects(p));
    default:
      return false;
  }
}

function referencesName(expr: Expression, name: string): boolean {
  switch (expr.type) {
    case "Identifier":
      return expr.name === name;
    case "BinaryExpression":
      return referencesName(expr.left, name) || referencesName(expr.right, name);
    case "UnaryExpression":
      return referencesName(expr.argument, name);
    case "CallExpression":
      return referencesName(expr.callee, name) || expr.args.some(a => referencesName(a, name));
    case "MethodCallExpression":
      return referencesName(expr.object, name) || expr.args.some(a => referencesName(a, name));
    case "IndexExpression":
      return referencesName(expr.object, name) || referencesName(expr.index, name);
    case "MemberExpression":
      return referencesName(expr.object, name);
    case "TableConstructor":
      return expr.fields.some(f => {
        if (f.kind === "index" && referencesName(f.index, name)) return true;
        return referencesName(f.value, name);
      });
    case "ParenExpression":
      return referencesName(expr.expression, name);
    case "TypeAssertion":
      return referencesName(expr.expression, name);
    case "IfElseExpression":
      return referencesName(expr.condition, name) || referencesName(expr.thenExp, name) ||
        expr.elseifClauses.some(c => referencesName(c.condition, name) || referencesName(c.value, name)) ||
        referencesName(expr.elseExp, name);
    case "StringInterpolation":
      return expr.parts.some(p => typeof p !== "string" && referencesName(p, name));
    case "FunctionExpression":
      return false;
    default:
      return false;
  }
}

function statementReferencesName(stmt: Statement | LastStatement, name: string): boolean {
  switch (stmt.type) {
    case "AssignmentStatement":
      return stmt.vars.some(v => {
        if (v.type === "Identifier") return v.name === name;
        return referencesName(v as Expression, name);
      }) || stmt.values.some(v => referencesName(v, name));
    case "CompoundAssignmentStatement":
      return referencesName(stmt.var as Expression, name) || referencesName(stmt.value, name);
    case "FunctionCallStatement":
      return referencesName(stmt.call, name);
    case "DoStatement":
      return stmt.body.some(s => statementReferencesName(s, name));
    case "WhileStatement":
      return referencesName(stmt.condition, name) || stmt.body.some(s => statementReferencesName(s, name));
    case "RepeatStatement":
      return stmt.body.some(s => statementReferencesName(s, name)) || referencesName(stmt.condition, name);
    case "IfStatement":
      return referencesName(stmt.condition, name) ||
        stmt.thenBody.some(s => statementReferencesName(s, name)) ||
        stmt.elseifClauses.some(c =>
          referencesName(c.condition, name) || c.body.some(s => statementReferencesName(s, name))
        ) ||
        (stmt.elseBody?.some(s => statementReferencesName(s, name)) ?? false);
    case "ForNumericStatement":
      return referencesName(stmt.var, name) || referencesName(stmt.start, name) ||
        referencesName(stmt.end, name) || (stmt.step ? referencesName(stmt.step, name) : false) ||
        stmt.body.some(s => statementReferencesName(s, name));
    case "ForInStatement":
      return stmt.vars.some(v => v.name === name) ||
        stmt.iter.some(i => referencesName(i, name)) ||
        stmt.body.some(s => statementReferencesName(s, name));
    case "FunctionStatement":
      return stmt.body.some(s => statementReferencesName(s, name));
    case "LocalFunctionStatement":
      return stmt.body.some(s => statementReferencesName(s, name));
    case "LocalStatement":
      return stmt.values?.some(v => referencesName(v, name)) ?? false;
    case "ReturnStatement":
      return stmt.values?.some(v => referencesName(v, name)) ?? false;
    default:
      return false;
  }
}

function transformExpression(expr: Expression, level: number): Expression {
  const loc = expr.loc;
  switch (expr.type) {
    case "BinaryExpression": {
      const left = transformExpression(expr.left, level);
      const right = transformExpression(expr.right, level);

      if (level >= 1) {
        if (left.type === "NumberLiteral" && right.type === "NumberLiteral") {
          const lv = parseFloat(left.value);
          const rv = parseFloat(right.value);
          let result: number | null = null;
          switch (expr.operator) {
            case "+": result = lv + rv; break;
            case "-": result = lv - rv; break;
            case "*": result = lv * rv; break;
            case "/": if (rv !== 0) result = lv / rv; break;
            case "//": if (rv !== 0) result = Math.floor(lv / rv); break;
            case "^": result = lv ** rv; break;
            case "%": result = lv % rv; break;
          }
          if (result !== null) {
            return { type: "NumberLiteral", value: String(result), loc };
          }
        }
        if (left.type === "StringLiteral" && right.type === "StringLiteral" && expr.operator === "..") {
          return { type: "StringLiteral", value: left.value + right.value, loc };
        }
      }

      if (level >= 2) {
        if (expr.operator === "^" && right.type === "NumberLiteral") {
          const rv = parseFloat(right.value);
          if (rv === 2) {
            return { type: "BinaryExpression", operator: "*", left, right: left, loc };
          }
          if (rv === 3) {
            const inner = { type: "BinaryExpression" as const, operator: "*" as const, left, right: left, loc };
            return { type: "BinaryExpression", operator: "*", left: inner, right: left, loc };
          }
          if (rv === 0) {
            return { type: "NumberLiteral", value: "1", loc };
          }
          if (rv === 1) {
            return left;
          }
        }
        if (expr.operator === "*") {
          if (right.type === "NumberLiteral") {
            const rv = parseFloat(right.value);
            if (rv === 2) {
              return { type: "BinaryExpression", operator: "+", left, right: left, loc };
            }
            if (rv === 0) {
              return { type: "NumberLiteral", value: "0", loc };
            }
            if (rv === 1) {
              return left;
            }
            if (rv === -1) {
              return { type: "UnaryExpression", operator: "-", argument: left, loc };
            }
          }
          if (left.type === "NumberLiteral") {
            const lv = parseFloat(left.value);
            if (lv === 0) {
              return { type: "NumberLiteral", value: "0", loc };
            }
            if (lv === 1) {
              return right;
            }
          }
        }
        if (expr.operator === "+") {
          if (right.type === "NumberLiteral" && parseFloat(right.value) === 0) {
            return left;
          }
          if (left.type === "NumberLiteral" && parseFloat(left.value) === 0) {
            return right;
          }
        }
        if (expr.operator === "-") {
          if (right.type === "NumberLiteral" && parseFloat(right.value) === 0) {
            return left;
          }
        }
      }

      if (left !== expr.left || right !== expr.right) {
        return { ...expr, left, right };
      }
      return expr;
    }

    case "UnaryExpression": {
      const argument = transformExpression(expr.argument, level);
      if (argument !== expr.argument) {
        return { ...expr, argument };
      }
      return expr;
    }

    case "CallExpression": {
      const callee = transformExpression(expr.callee, level);
      const args = expr.args.map(a => transformExpression(a, level));
      if (callee !== expr.callee || args.some((a, i) => a !== expr.args[i])) {
        return { ...expr, callee, args };
      }
      return expr;
    }

    case "MethodCallExpression": {
      const object = transformExpression(expr.object, level);
      const args = expr.args.map(a => transformExpression(a, level));
      if (object !== expr.object || args.some((a, i) => a !== expr.args[i])) {
        return { ...expr, object, args };
      }
      return expr;
    }

    case "IndexExpression": {
      const object = transformExpression(expr.object, level);
      const index = transformExpression(expr.index, level);
      if (object !== expr.object || index !== expr.index) {
        return { ...expr, object, index };
      }
      return expr;
    }

    case "MemberExpression": {
      const object = transformExpression(expr.object, level);
      if (object !== expr.object) {
        return { ...expr, object };
      }
      return expr;
    }

    case "TableConstructor": {
      let changed = false;
      const fields = expr.fields.map(f => {
        if (f.kind === "index") {
          const newIndex = transformExpression(f.index, level);
          const newValue = transformExpression(f.value, level);
          if (newIndex !== f.index || newValue !== f.value) changed = true;
          return { ...f, index: newIndex, value: newValue };
        }
        const newValue = transformExpression(f.value, level);
        if (newValue !== f.value) changed = true;
        return { ...f, value: newValue };
      });
      if (changed) {
        return { ...expr, fields };
      }
      return expr;
    }

    case "ParenExpression": {
      const expression = transformExpression(expr.expression, level);
      if (expression !== expr.expression) {
        return { ...expr, expression };
      }
      return expr;
    }

    case "TypeAssertion": {
      const expression = transformExpression(expr.expression, level);
      if (expression !== expr.expression) {
        return { ...expr, expression };
      }
      return expr;
    }

    case "IfElseExpression": {
      const condition = transformExpression(expr.condition, level);
      const thenExp = transformExpression(expr.thenExp, level);
      const elseifClauses = expr.elseifClauses.map(c => ({
        condition: transformExpression(c.condition, level),
        value: transformExpression(c.value, level),
      }));
      const elseExp = transformExpression(expr.elseExp, level);
      return { ...expr, condition, thenExp, elseifClauses, elseExp };
    }

    case "StringInterpolation": {
      const parts = expr.parts.map(p => typeof p === "string" ? p : transformExpression(p, level));
      return { ...expr, parts };
    }

    case "FunctionExpression": {
      const body = walkStatements(expr.body, level);
      return { ...expr, body };
    }

    default:
      return expr;
  }
}

function walkStatement(stmt: Statement | LastStatement, level: number): Statement | LastStatement {
  switch (stmt.type) {
    case "AssignmentStatement": {
      const values = stmt.values.map(v => transformExpression(v, level));
      return { ...stmt, values };
    }
    case "CompoundAssignmentStatement": {
      const value = transformExpression(stmt.value, level);
      return { ...stmt, value };
    }
    case "FunctionCallStatement": {
      const call = transformExpression(stmt.call, level) as any;
      return { ...stmt, call };
    }
    case "DoStatement": {
      const body = walkStatements(stmt.body, level);
      return { ...stmt, body };
    }
    case "WhileStatement": {
      const condition = transformExpression(stmt.condition, level);
      const body = walkStatements(stmt.body, level);
      return { ...stmt, condition, body };
    }
    case "RepeatStatement": {
      const body = walkStatements(stmt.body, level);
      const condition = transformExpression(stmt.condition, level);
      return { ...stmt, body, condition };
    }
    case "IfStatement": {
      const condition = transformExpression(stmt.condition, level);
      const thenBody = walkStatements(stmt.thenBody, level);
      const elseifClauses = stmt.elseifClauses.map(c => ({
        condition: transformExpression(c.condition, level),
        body: walkStatements(c.body, level),
      }));
      const elseBody = stmt.elseBody ? walkStatements(stmt.elseBody, level) : undefined;
      return { ...stmt, condition, thenBody, elseifClauses, elseBody };
    }
    case "ForNumericStatement": {
      const start = transformExpression(stmt.start, level);
      const end = transformExpression(stmt.end, level);
      const step = stmt.step ? transformExpression(stmt.step, level) : undefined;
      const body = walkStatements(stmt.body, level);
      return { ...stmt, start, end, step, body };
    }
    case "ForInStatement": {
      const iter = stmt.iter.map(i => transformExpression(i, level));
      const body = walkStatements(stmt.body, level);
      return { ...stmt, iter, body };
    }
    case "FunctionStatement": {
      const body = walkStatements(stmt.body, level);
      return { ...stmt, body };
    }
    case "LocalFunctionStatement": {
      const body = walkStatements(stmt.body, level);
      return { ...stmt, body };
    }
    case "LocalStatement": {
      const values = stmt.values?.map(v => transformExpression(v, level));
      return { ...stmt, values };
    }
    case "ReturnStatement": {
      const values = stmt.values?.map(v => transformExpression(v, level));
      return { ...stmt, values };
    }
    default:
      return stmt;
  }
}

function walkStatements(body: (Statement | LastStatement)[], level: number): (Statement | LastStatement)[] {
  return body.map(stmt => walkStatement(stmt, level));
}

function eliminateDeadStoresInBody(body: (Statement | LastStatement)[]): (Statement | LastStatement)[] {
  const result: (Statement | LastStatement)[] = [];

  for (let i = 0; i < body.length; i++) {
    const stmt = body[i];

    if (stmt.type === "LocalStatement") {
      const varNames = stmt.vars.map(v => v.name);
      const values = stmt.values ?? [];
      const hasSideEffect = values.some(v => hasSideEffects(v));
      const isReferenced = varNames.some(name =>
        body.slice(i + 1).some(s => statementReferencesName(s, name))
      );

      if (!isReferenced && !hasSideEffect) {
        continue;
      }
    }

    if ("body" in stmt && Array.isArray((stmt as any).body)) {
      const s = stmt as any;
      result.push({
        ...s,
        body: eliminateDeadStoresInBody(s.body),
      });
    } else if ("thenBody" in stmt) {
      const s = stmt as any;
      result.push({
        ...s,
        thenBody: eliminateDeadStoresInBody(s.thenBody),
        elseifClauses: s.elseifClauses?.map((c: any) => ({
          ...c,
          body: eliminateDeadStoresInBody(c.body),
        })),
        elseBody: s.elseBody ? eliminateDeadStoresInBody(s.elseBody) : undefined,
      });
    } else {
      result.push(stmt);
    }
  }

  return result;
}

function applyGCOptimizationsInBody(body: (Statement | LastStatement)[]): (Statement | LastStatement)[] {
  const result: (Statement | LastStatement)[] = [];
  let i = 0;

  while (i < body.length) {
    const stmt = body[i];

    if (
      stmt.type === "LocalStatement" &&
      stmt.vars.length === 1 &&
      stmt.values &&
      stmt.values.length === 1 &&
      stmt.values[0].type === "TableConstructor" &&
      stmt.values[0].fields.length === 0
    ) {
      const varName = stmt.vars[0].name;
      const loc = stmt.loc;
      const tableFields: any[] = [];
      let j = i + 1;
      let numericIndex = 1;

      while (j < body.length) {
        const next = body[j];
        if (next.type === "AssignmentStatement" && next.vars.length === 1 && next.values.length === 1) {
          const target = next.vars[0];
          if (
            target.type === "IndexExpression" &&
            target.object.type === "Identifier" &&
            target.object.name === varName
          ) {
            const idx = target.index;
            if (idx.type === "NumberLiteral" && parseFloat(idx.value) === numericIndex) {
              tableFields.push({ kind: "value", value: next.values[0] });
              numericIndex++;
              j++;
              continue;
            }
            if (idx.type === "StringLiteral") {
              tableFields.push({ kind: "named", name: idx.value, value: next.values[0] });
              j++;
              continue;
            }
            break;
          }
          if (
            target.type === "MemberExpression" &&
            target.object.type === "Identifier" &&
            target.object.name === varName
          ) {
            tableFields.push({ kind: "named", name: target.property, value: next.values[0] });
            j++;
            continue;
          }
        }
        break;
      }

      let usedAfter = false;
      for (let k = j; k < body.length; k++) {
        if (statementReferencesName(body[k], varName)) {
          usedAfter = true;
          break;
        }
      }

      if (tableFields.length > 0 && !usedAfter) {
        result.push({
          type: "LocalStatement",
          vars: [{ name: varName }],
          values: [{
            type: "TableConstructor",
            fields: tableFields,
            loc,
          }],
          loc,
        });
        i = j;
        continue;
      }
    }

    if ("body" in stmt && Array.isArray((stmt as any).body)) {
      const s = stmt as any;
      result.push({
        ...s,
        body: applyGCOptimizationsInBody(s.body),
      });
    } else if ("thenBody" in stmt) {
      const s = stmt as any;
      result.push({
        ...s,
        thenBody: applyGCOptimizationsInBody(s.thenBody),
        elseifClauses: s.elseifClauses?.map((c: any) => ({
          ...c,
          body: applyGCOptimizationsInBody(c.body),
        })),
        elseBody: s.elseBody ? applyGCOptimizationsInBody(s.elseBody) : undefined,
      });
    } else {
      result.push(stmt);
    }

    i++;
  }

  return result;
}

export function optimizePerformance(ast: Chunk, options?: PerformanceOptimizerOptions): Chunk {
  if (options?.enabled === false) return ast;

  const seed = options?.seed ?? 0;
  createRng(seed);

  const level = options?.level ?? 2;
  const useConstantFolding = options?.constantFolding ?? (level >= 1);
  const useStrengthReduction = options?.strengthReduction ?? (level >= 2);
  const useDeadStoreElimination = options?.deadStoreElimination ?? (level >= 2);
  const useGCOptimizations = options?.gcOptimizations ?? (level >= 3);
  const activeLevel = useConstantFolding ? (useStrengthReduction ? 2 : 1) : 0;

  let result: Chunk = { ...ast };

  if (activeLevel > 0) {
    result = { ...result, body: walkStatements(result.body, activeLevel) };
  }

  if (useDeadStoreElimination) {
    result = { ...result, body: eliminateDeadStoresInBody(result.body) };
  }

  if (useGCOptimizations) {
    result = { ...result, body: applyGCOptimizationsInBody(result.body) };
  }

  return result;
}
