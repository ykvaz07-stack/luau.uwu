import type { Chunk, Statement, LastStatement, Expression } from "../ast/types.js";
import { MBAEngine } from "./MBAExpressionEngine.js";

export interface ControlFlowDoublingOptions {
  enabled?: boolean;
  seed?: number;
}

function cloneLoc(loc?: { start: any; end: any }): any {
  return loc ? { start: { ...loc.start }, end: { ...loc.end } } : { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function doubleCondition(
  cond: Expression,
  engine: MBAEngine,
  rng: () => number,
  counter: { value: number }
): Expression {
  const loc = cloneLoc(cond.loc);
  const guardVar = `_g${counter.value++}`;
  const alt = engine.createOpaquePredicate(loc);
  if (alt.expected === false) return cond;
  const a = 1 + Math.floor(rng() * 100);
  const b = 1 + Math.floor(rng() * 100);
  const dummy = {
    type: "BinaryExpression" as const,
    operator: "==" as const,
    left: { type: "NumberLiteral" as const, value: String(a), loc },
    right: { type: "NumberLiteral" as const, value: String(a + b - b), loc },
    loc,
  };
  return {
    type: "BinaryExpression" as const,
    operator: "and" as const,
    left: cond,
    right: {
      type: "BinaryExpression" as const,
      operator: "==",
      left: dummy,
      right: { type: "BooleanLiteral" as const, value: true, loc },
      loc,
    },
    loc,
  };
}

function transformStatement(
  stmt: Statement | LastStatement,
  engine: MBAEngine,
  rng: () => number,
  counter: { value: number }
): Statement | LastStatement {
  switch (stmt.type) {
    case "IfStatement": {
      const cond = stmt.condition;
      const newCond = rng() > 0.4 ? doubleCondition(cond, engine, rng, counter) : cond;
      const thenBody = stmt.thenBody.map(s => transformStatement(s, engine, rng, counter));
      const elseifClauses = stmt.elseifClauses.map(c => ({
        condition: rng() > 0.4 ? doubleCondition(c.condition, engine, rng, counter) : c.condition,
        body: c.body.map(s => transformStatement(s, engine, rng, counter)),
      }));
      const elseBody = stmt.elseBody?.map(s => transformStatement(s, engine, rng, counter));
      return { ...stmt, condition: newCond, thenBody, elseifClauses, elseBody };
    }
    case "WhileStatement": {
      if (rng() > 0.3) {
        const newCond = doubleCondition(stmt.condition, engine, rng, counter);
        return { ...stmt, condition: newCond, body: stmt.body.map(s => transformStatement(s, engine, rng, counter)) };
      }
      return { ...stmt, body: stmt.body.map(s => transformStatement(s, engine, rng, counter)) };
    }
    case "RepeatStatement": {
      if (rng() > 0.3) {
        const newCond = doubleCondition(stmt.condition, engine, rng, counter);
        return { ...stmt, condition: newCond, body: stmt.body.map(s => transformStatement(s, engine, rng, counter)) };
      }
      return { ...stmt, body: stmt.body.map(s => transformStatement(s, engine, rng, counter)) };
    }
    case "DoStatement":
      return { ...stmt, body: stmt.body.map(s => transformStatement(s, engine, rng, counter)) };
    case "ForNumericStatement":
      return { ...stmt, body: stmt.body.map(s => transformStatement(s, engine, rng, counter)) };
    case "ForInStatement":
      return { ...stmt, body: stmt.body.map(s => transformStatement(s, engine, rng, counter)) };
    case "LocalFunctionStatement":
    case "FunctionStatement":
      return {
        ...stmt,
        body: stmt.body.map(s => transformStatement(s, engine, rng, counter)),
      };
    default:
      return stmt;
  }
}

export function applyControlFlowDoubling(ast: Chunk, options: ControlFlowDoublingOptions = {}): Chunk {
  if (options.enabled === false) return ast;
  const seed = options.seed ?? 0;
  const engine = new MBAEngine({ seed });
  const rng = createRng(seed + 100);
  const counter = { value: seed * 1000 };
  return {
    ...ast,
    body: ast.body.map(s => transformStatement(s, engine, rng, counter)),
  };
}