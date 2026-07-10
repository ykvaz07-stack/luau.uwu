import type { Chunk, Statement, LastStatement, Expression } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";
import { MBAEngine } from "./MBAExpressionEngine.js";

export interface ControlFlowFlattenerOptions {
  enabled?: boolean;
  seed?: number;
  opaquePredicates?: boolean;
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

function assignStmt(vars: { name: string; type?: undefined }[], values: Expression[], loc: SourceLocation): Statement {
  return {
    type: "AssignmentStatement",
    vars: vars.map((v) => ({ type: "Identifier", name: v.name, loc } as any)),
    values,
    loc,
  };
}

function localNumStmt(name: string, value: number, loc: SourceLocation): Statement {
  return {
    type: "LocalStatement",
    vars: [{ name, type: undefined }],
    values: [numExp(value, loc)],
    loc,
  };
}

function ifStmt(cond: Expression, thenBody: (Statement | LastStatement)[], loc: SourceLocation): Statement {
  return {
    type: "IfStatement",
    condition: cond,
    thenBody,
    elseifClauses: [],
    elseBody: [],
    loc,
  };
}

interface Block {
  id: number;
  body: (Statement | LastStatement)[];
  isEntry: boolean;
  isExit: boolean;
}

function splitIntoBlocks(stmts: (Statement | LastStatement)[]): Block[] {
  const blocks: Block[] = [];
  let currentBlock: (Statement | LastStatement)[] = [];
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

  if (blocks.length === 0) return [];

  blocks[0].isEntry = true;
  blocks[blocks.length - 1].isExit = true;

  return blocks;
}

function flattenBlocks(
  blocks: Block[],
  stateVar: string,
  engine: MBAEngine,
  loc: SourceLocation
): (Statement | LastStatement)[] {
  if (blocks.length <= 1) {
    return blocks.flatMap((b) => b.body);
  }

  const shuffled = [...blocks];
  for (let i = 1; i < shuffled.length; i++) {
    const j = 1 + Math.floor(engine["rng"]() * (shuffled.length - 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const stateMap = new Map<number, number>();
  for (let i = 0; i < shuffled.length; i++) {
    stateMap.set(shuffled[i].id, i + 1);
  }

  const entryState = stateMap.get(blocks[0].id)!;
  const exitState = shuffled.length + 1;

  const result: (Statement | LastStatement)[] = [];

  result.push(localNumStmt(stateVar, entryState, loc));

  const whileHead: Statement = {
    type: "WhileStatement",
    condition: { type: "BooleanLiteral", value: true, loc },
    body: [],
    loc,
  };

  const dispatcherCases: Statement[] = [];

  for (let i = 0; i < shuffled.length; i++) {
    const block = shuffled[i];
    const currentState = stateMap.get(block.id)!;
    const isExit = block.isExit;

    const condExp: Expression = {
      type: "BinaryExpression",
      operator: "==",
      left: idExp(stateVar, loc),
      right: numExp(currentState, loc),
      loc,
    };

    let blockBody: (Statement | LastStatement)[];

    if (block.body.length === 1 && isExit) {
      blockBody = block.body;
    } else {
      blockBody = [...block.body];

      let nextState: number;
      if (i < shuffled.length - 1) {
        nextState = stateMap.get(shuffled[i + 1].id)!;
      } else {
        nextState = exitState;
      }

      if (!isExit) {
        blockBody.push(assignStmt(
          [{ name: stateVar, type: undefined }],
          [numExp(nextState, loc)],
          loc
        ));
      }
    }

    const blockIf: Statement = ifStmt(condExp, blockBody, loc);

    if (engine) {
      const opaque = engine.createOpaquePredicate(loc);
      if (opaque.expected) {
        blockBody.unshift(blockIf);
        const junkExit: LastStatement = { type: "BreakStatement", loc };
        const junkGuard: Statement = {
          type: "IfStatement",
          condition: { type: "UnaryExpression", operator: "not", argument: idExp(stateVar, loc), loc },
          thenBody: [junkExit],
          elseifClauses: [],
          loc,
        };
        result.push(junkGuard);
        continue;
      }
    }

    dispatcherCases.push(blockIf);
  }

  const exitBlockBody: (Statement | LastStatement)[] = [
    { type: "BreakStatement", loc },
  ];

  dispatcherCases.push(ifStmt(
    { type: "BinaryExpression", operator: "==", left: idExp(stateVar, loc), right: numExp(exitState, loc), loc },
    exitBlockBody,
    loc
  ));

  (whileHead as any).body = dispatcherCases;
  result.push(whileHead);

  return result;
}

function flattenFunctionBody(
  body: (Statement | LastStatement)[],
  stateVar: string,
  engine: MBAEngine,
  loc: SourceLocation
): (Statement | LastStatement)[] {
  const blocks = splitIntoBlocks(body);
  if (blocks.length <= 1) return body;
  return flattenBlocks(blocks, stateVar, engine, loc);
}

function transformStatement(
  stmt: Statement | LastStatement,
  stateCounter: { value: number },
  engine: MBAEngine
): Statement | LastStatement {
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

export function flattenControlFlow(ast: Chunk, options: ControlFlowFlattenerOptions = {}): Chunk {
  const enabled = options.enabled !== false;
  if (!enabled) return ast;

  const seed = options.seed ?? 0;
  const engine = options.opaquePredicates !== false ? new MBAEngine({ seed }) : null as any;
  const stateCounter = { value: seed * 100 };

  return {
    ...ast,
    body: ast.body.map((s) => transformStatement(s, stateCounter, engine)),
  };
}
