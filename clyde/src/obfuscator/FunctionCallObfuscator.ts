import type { Chunk, Statement, LastStatement, Expression, CallExpression, MethodCallExpression } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";

export interface FunctionCallObfuscatorOptions {
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

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function getCallName(call: CallExpression | MethodCallExpression): string | null {
  if (call.type === "CallExpression" && call.callee.type === "Identifier") {
    return call.callee.name;
  }
  if (call.type === "MethodCallExpression") {
    return call.method;
  }
  return null;
}

function getCallArgs(call: CallExpression | MethodCallExpression): Expression[] {
  return call.args;
}

function collectFunctionCalls(body: (Statement | LastStatement)[]): { stmt: any; callee: string; args: Expression[]; loc: SourceLocation }[] {
  const calls: { stmt: any; callee: string; args: Expression[]; loc: SourceLocation }[] = [];
  for (const stmt of body) {
    if (stmt.type === "FunctionCallStatement") {
      const call = stmt.call as CallExpression | MethodCallExpression;
      const name = getCallName(call);
      if (name) {
        calls.push({ stmt, callee: name, args: getCallArgs(call), loc: stmt.loc });
      }
    }
    if ("body" in stmt && Array.isArray((stmt as any).body)) {
      calls.push(...collectFunctionCalls((stmt as any).body));
    }
    if ("thenBody" in stmt) {
      const s = stmt as any;
      calls.push(...collectFunctionCalls(s.thenBody));
      for (const c of s.elseifClauses || []) calls.push(...collectFunctionCalls(c.body));
      if (s.elseBody) calls.push(...collectFunctionCalls(s.elseBody));
    }
  }
  return calls;
}

function getCallExpr(call: CallExpression | MethodCallExpression): { name: string; args: Expression[] } | null {
  if (call.type === "CallExpression") {
    if (call.callee.type === "Identifier") {
      return { name: call.callee.name, args: call.args };
    }
    if (call.callee.type === "MemberExpression" && call.callee.object.type === "Identifier") {
      return { name: `${call.callee.object.name}.${call.callee.property}`, args: call.args };
    }
  } else if (call.type === "MethodCallExpression") {
    return { name: call.method, args: call.args };
  }
  return null;
}

function wrapCallThroughTable(
  stmt: Statement | LastStatement,
  call: CallExpression | MethodCallExpression,
  tableName: string,
  idx: number,
  loc: SourceLocation,
): Statement | LastStatement {
  if (stmt.type !== "FunctionCallStatement") return stmt;

  const wrappedArgs = [
    { type: "IndexExpression", object: idExp(tableName, loc), index: numExp(idx, loc), loc } as Expression,
    ...getCallArgs(call),
  ];

  const wrapperCall: CallExpression = {
    type: "CallExpression",
    callee: idExp("_wrapDispatch", loc),
    args: wrappedArgs,
    loc,
  };

  return {
    ...stmt,
    call: wrapperCall,
  };
}

function transformStatement(
  stmt: Statement | LastStatement,
  callInfo: { callee: string; idx: number }[],
  tableName: string,
  rng: () => number,
  intensity: number
): Statement | LastStatement {
  if (stmt.type === "FunctionCallStatement") {
    const call = stmt.call as CallExpression | MethodCallExpression;
    const info = getCallExpr(call);
    if (info && rng() < intensity) {
      const match = callInfo.find((c) => c.callee === info.name);
      if (match) {
        return wrapCallThroughTable(stmt, call, tableName, match.idx, stmt.loc);
      }
    }
  }

  if ("body" in stmt && Array.isArray((stmt as any).body)) {
    const s = stmt as any;
    return { ...s, body: s.body.map((b: any) => transformStatement(b, callInfo, tableName, rng, intensity)) };
  }
  if ("thenBody" in stmt) {
    const s = stmt as any;
    return {
      ...s,
      thenBody: s.thenBody.map((b: any) => transformStatement(b, callInfo, tableName, rng, intensity)),
      elseifClauses: s.elseifClauses?.map((c: any) => ({
        ...c,
        body: c.body.map((b: any) => transformStatement(b, callInfo, tableName, rng, intensity)),
      })),
      elseBody: s.elseBody?.map((b: any) => transformStatement(b, callInfo, tableName, rng, intensity)),
    };
  }

  return stmt;
}

export function obfuscateFunctionCalls(ast: Chunk, options: FunctionCallObfuscatorOptions = {}): Chunk {
  const enabled = options.enabled !== false;
  if (!enabled) return ast;

  const intensity = Math.min(1, Math.max(0, options.intensity ?? 0.5));
  const seed = options.seed ?? 0;
  const rng = createRng(seed);

  const calls = collectFunctionCalls(ast.body);
  const uniqueCallees = [...new Set(calls.map((c) => c.callee))];

  if (uniqueCallees.length === 0) return ast;

  const callInfo = uniqueCallees.map((callee, i) => ({ callee, idx: i + 1 }));

  const tableName = `_fnTbl_${Math.floor(rng() * 100000)}`;
  const loc = ast.body[0]?.loc ?? { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };

  const tableStmt: Statement = {
    type: "LocalStatement",
    vars: [{ name: tableName, type: undefined }],
    values: [{
      type: "TableConstructor",
      fields: callInfo.map((ci) => ({
        kind: "value" as const,
        value: { type: "Identifier", name: ci.callee, loc },
      })),
      loc,
    }],
    loc,
  };

  const dispatchFunc: Statement = {
    type: "LocalStatement",
    vars: [{ name: "_wrapDispatch", type: undefined }],
    values: [{
      type: "FunctionExpression",
      params: [
        { type: "Param", name: "fn", variadic: false, loc },
        { type: "Param", name: "...", variadic: true, loc },
      ],
      body: [
        {
          type: "ReturnStatement",
          values: [{
            type: "CallExpression",
            callee: idExp("fn", loc),
            args: [{ type: "VarargExpression", loc }],
            loc,
          }],
          loc,
        },
      ],
      loc,
    }],
    loc,
  };

  const transformedBody = ast.body.map((s) => transformStatement(s, callInfo, tableName, rng, intensity));

  return {
    ...ast,
    body: [tableStmt, dispatchFunc, ...transformedBody],
  };
}
