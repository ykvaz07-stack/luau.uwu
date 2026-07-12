import type {
  Chunk,
  Statement,
  LastStatement,
  Expression,
  CallExpression,
  TableConstructor,
  TableField,
} from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";

function makeLoc(start: SourceLocation["start"], end: SourceLocation["end"]): SourceLocation {
  return { start, end };
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const ENCRYPTION_STRATEGIES = ["xor", "add-rotate", "xor-chain", "sbox"] as const;
type EncryptionStrategy = (typeof ENCRYPTION_STRATEGIES)[number];

function encodeStringXor(str: string, key: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < str.length; i++) {
    result.push(str.charCodeAt(i) ^ key);
  }
  return result;
}

function encodeStringXorChain(str: string, keys: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const k = keys[i % keys.length];
    result.push(str.charCodeAt(i) ^ k);
  }
  return result;
}

function encodeStringAddRotate(str: string, key: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < str.length; i++) {
    result.push((str.charCodeAt(i) + key + i) & 0xff);
  }
  return result;
}

function decodeStringAddRotate(bytes: number[], key: number): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode((bytes[i] - key - i) & 0xff);
  }
  return s;
}

function encodeStringSbox(str: string, sbox: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < str.length; i++) {
    result.push(sbox[str.charCodeAt(i) & 0xff]);
  }
  return result;
}

function generateSbox(rng: () => number): number[] {
  const sbox = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [sbox[i], sbox[j]] = [sbox[j], sbox[i]];
  }
  return sbox;
}

function crc8(s: string, polynomial: number): number {
  let crc = 0;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x80) {
        crc = ((crc << 1) ^ polynomial) & 0xff;
      } else {
        crc = (crc << 1) & 0xff;
      }
    }
  }
  return crc;
}

function createCrc8FunctionAst(crcPoly: number, loc: SourceLocation): { statement: Statement; name: string } {
  const name = `_crc8_${Math.random().toString(36).substring(2, 6)}`;
  const statement: Statement = {
    type: "LocalStatement",
    vars: [{ name, type: undefined }],
    values: [{
      type: "FunctionExpression",
      params: [{ type: "Param", name: "s", variadic: false, loc }],
      body: [
        {
          type: "LocalStatement",
          vars: [{ name: "crc", type: undefined }],
          values: [{ type: "NumberLiteral", value: "0", loc }],
          loc,
        },
        {
          type: "ForNumericStatement",
          var: { type: "Identifier", name: "i", loc },
          start: { type: "NumberLiteral", value: "1", loc },
          end: { type: "UnaryExpression", operator: "#", argument: { type: "Identifier", name: "s", loc }, loc },
          body: [
            {
              type: "AssignmentStatement",
              vars: [{ type: "Identifier", name: "crc", loc }],
              values: [{
                type: "CallExpression",
                callee: { type: "MemberExpression", object: { type: "Identifier", name: "bit32", loc }, property: "bxor", loc },
                args: [
                  { type: "Identifier", name: "crc", loc },
                  {
                    type: "CallExpression",
                    callee: { type: "MemberExpression", object: { type: "Identifier", name: "string", loc }, property: "byte", loc },
                    args: [
                      { type: "Identifier", name: "s", loc },
                      { type: "Identifier", name: "i", loc },
                    ],
                    loc,
                  },
                ],
                loc,
              }],
              loc,
            },
            {
              type: "ForNumericStatement",
              var: { type: "Identifier", name: "_", loc },
              start: { type: "NumberLiteral", value: "1", loc },
              end: { type: "NumberLiteral", value: "8", loc },
              body: [
                {
                  type: "IfStatement",
                  condition: {
                    type: "BinaryExpression",
                    operator: "~=",
                    left: {
                      type: "CallExpression",
                      callee: { type: "MemberExpression", object: { type: "Identifier", name: "bit32", loc }, property: "band", loc },
                      args: [
                        { type: "Identifier", name: "crc", loc },
                        { type: "NumberLiteral", value: "0x80", loc },
                      ],
                      loc,
                    },
                    right: { type: "NumberLiteral", value: "0", loc },
                    loc,
                  },
                  thenBody: [
                    {
                      type: "AssignmentStatement",
                      vars: [{ type: "Identifier", name: "crc", loc }],
                      values: [{
                        type: "CallExpression",
                        callee: { type: "MemberExpression", object: { type: "Identifier", name: "bit32", loc }, property: "bxor", loc },
                        args: [
                          {
                            type: "CallExpression",
                            callee: { type: "MemberExpression", object: { type: "Identifier", name: "bit32", loc }, property: "lshift", loc },
                            args: [
                              { type: "Identifier", name: "crc", loc },
                              { type: "NumberLiteral", value: "1", loc },
                            ],
                            loc,
                          },
                          { type: "NumberLiteral", value: String(crcPoly), loc },
                        ],
                        loc,
                      }],
                      loc,
                    },
                  ],
                  elseifClauses: [],
                  elseBody: [
                    {
                      type: "AssignmentStatement",
                      vars: [{ type: "Identifier", name: "crc", loc }],
                      values: [{
                        type: "CallExpression",
                        callee: { type: "MemberExpression", object: { type: "Identifier", name: "bit32", loc }, property: "lshift", loc },
                        args: [
                          { type: "Identifier", name: "crc", loc },
                          { type: "NumberLiteral", value: "1", loc },
                        ],
                        loc,
                      }],
                      loc,
                    },
                  ],
                  loc,
                },
                {
                  type: "AssignmentStatement",
                  vars: [{ type: "Identifier", name: "crc", loc }],
                  values: [{
                    type: "CallExpression",
                    callee: { type: "MemberExpression", object: { type: "Identifier", name: "bit32", loc }, property: "band", loc },
                    args: [
                      { type: "Identifier", name: "crc", loc },
                      { type: "NumberLiteral", value: "0xFF", loc },
                    ],
                    loc,
                  }],
                  loc,
                },
              ],
              loc,
            },
          ],
          loc,
        },
        {
          type: "ReturnStatement",
          values: [{ type: "Identifier", name: "crc", loc }],
          loc,
        },
      ],
      loc,
    }],
    loc,
  };
  return { statement, name };
}

function fragmentString(str: string, rng: () => number): { fragments: number[][]; order: number[] } {
  if (str.length <= 2) return { fragments: [encodeStringXor(str, 0x5A)], order: [0] };

  const numFrags = Math.min(str.length, 2 + Math.floor(rng() * Math.min(4, str.length - 1)));
  const fragSize = Math.floor(str.length / numFrags);
  const fragments: number[][] = [];

  let pos = 0;
  for (let i = 0; i < numFrags; i++) {
    const size = i < numFrags - 1 ? fragSize + (Math.floor(rng() * 3) - 1) : str.length - pos;
    const frag = str.slice(pos, pos + Math.max(1, size));
    fragments.push(encodeStringXor(frag, 0x5A));
    pos += frag.length;
  }

  const order = Array.from({ length: numFrags }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  return { fragments, order };
}

function makeDecodeCall(
  bytes: number[],
  key: number,
  loc: SourceLocation,
  decoderName: string,
  strategy: EncryptionStrategy = "xor"
): CallExpression {
  const tableFields: TableField[] = bytes.map((b) => ({
    kind: "value" as const,
    value: {
      type: "NumberLiteral",
      value: String(b),
      loc,
    },
  }));

  const table: TableConstructor = {
    type: "TableConstructor",
    fields: tableFields,
    loc,
  };

  const args: Expression[] = [table];

  if (strategy === "xor") {
    args.push({ type: "NumberLiteral", value: String(key), loc });
    args.push({ type: "StringLiteral", value: "xor", loc });
  } else if (strategy === "add-rotate") {
    args.push({ type: "NumberLiteral", value: String(key), loc });
    args.push({ type: "StringLiteral", value: "add", loc });
  } else if (strategy === "sbox") {
    args.push({ type: "NumberLiteral", value: String(key), loc });
    args.push({ type: "StringLiteral", value: "sbox", loc });
  } else {
    args.push({ type: "NumberLiteral", value: String(key), loc });
  }

  return {
    type: "CallExpression",
    callee: {
      type: "Identifier",
      name: decoderName,
      loc,
    },
    args,
    loc,
  };
}

function makeDecoderStatements(
  strategies: EncryptionStrategy[],
  keys: number[],
  sboxTables: number[][],
  loc: SourceLocation,
  decoderName: string,
  useCrc8?: boolean,
  crcPoly?: number
): Statement[] {
  const cacheName = `_c_${Math.random().toString(36).substring(2, 6)}`;

  const cacheStmt: Statement = {
    type: "LocalStatement",
    vars: [{ name: cacheName, type: undefined }],
    values: [{ type: "TableConstructor", fields: [], loc }],
    loc,
  };

  const sboxTableStmts: Statement[] = [];
  for (let si = 0; si < sboxTables.length; si++) {
    const sboxName = `_sb${si}_${Math.random().toString(36).substring(2, 4)}`;
    const sboxFields: TableField[] = sboxTables[si].map((b) => ({
      kind: "value" as const,
      value: { type: "NumberLiteral", value: String(b), loc },
    }));
    sboxTableStmts.push({
      type: "LocalStatement",
      vars: [{ name: sboxName, type: undefined }],
      values: [{ type: "TableConstructor", fields: sboxFields, loc }],
      loc,
    });
  }

  const sboxNames = sboxTableStmts.map(() => `_sb${Math.random().toString(36).substring(2, 4)}`);

  const decoderFuncBody: (Statement | LastStatement)[] = [];

  decoderFuncBody.push({
    type: "LocalStatement",
    vars: [{ name: "t", type: undefined }],
    values: [{ type: "Identifier", name: "t", loc }],
    loc,
  });

  decoderFuncBody.push({
    type: "LocalStatement",
    vars: [{ name: "k", type: undefined }],
    values: [{ type: "Identifier", name: "k", loc }],
    loc,
  });

  decoderFuncBody.push({
    type: "LocalStatement",
    vars: [{ name: "mode", type: undefined }],
    values: [{ type: "Identifier", name: "mode", loc }],
    loc,
  });

  decoderFuncBody.push({
    type: "IfStatement",
    condition: {
      type: "IndexExpression",
      object: { type: "Identifier", name: cacheName, loc },
      index: { type: "Identifier", name: "t", loc },
      loc,
    },
    thenBody: [
      {
        type: "ReturnStatement",
        values: [
          {
            type: "IndexExpression",
            object: { type: "Identifier", name: cacheName, loc },
            index: { type: "Identifier", name: "t", loc },
            loc,
          },
        ],
        loc,
      },
    ],
    elseifClauses: [],
    loc,
  });

  decoderFuncBody.push({
    type: "LocalStatement",
    vars: [{ name: "s", type: undefined }],
    values: [{ type: "TableConstructor", fields: [], loc }],
    loc,
  });

  const iterBody: (Statement | LastStatement)[] = [
    {
      type: "LocalStatement",
      vars: [{ name: "ch", type: undefined }],
      values: [
        {
          type: "IndexExpression",
          object: { type: "Identifier", name: "t", loc },
          index: { type: "Identifier", name: "i", loc },
          loc,
        },
      ],
      loc,
    },
  ];

  const ifSboxMode: Statement = {
    type: "IfStatement",
    condition: {
      type: "BinaryExpression",
      operator: "==",
      left: { type: "Identifier", name: "mode", loc },
      right: { type: "StringLiteral", value: "sbox", loc },
      loc,
    },
    thenBody: [
      {
        type: "AssignmentStatement",
        vars: [{ type: "IndexExpression", object: { type: "Identifier", name: "s", loc }, index: { type: "Identifier", name: "i", loc }, loc }],
        values: [{
          type: "CallExpression",
          callee: { type: "MemberExpression", object: { type: "Identifier", name: "string", loc }, property: "char", loc },
          args: [{
            type: "IndexExpression",
            object: { type: "Identifier", name: sboxNames[0] || "_sb", loc },
            index: { type: "Identifier", name: "ch", loc },
            loc,
          }],
          loc,
        }],
        loc,
      },
    ],
    elseifClauses: [
      {
        condition: {
          type: "BinaryExpression",
          operator: "==",
          left: { type: "Identifier", name: "mode", loc },
          right: { type: "StringLiteral", value: "add", loc },
          loc,
        },
        body: [
          {
            type: "AssignmentStatement",
            vars: [{ type: "IndexExpression", object: { type: "Identifier", name: "s", loc }, index: { type: "Identifier", name: "i", loc }, loc }],
            values: [{
              type: "CallExpression",
              callee: { type: "MemberExpression", object: { type: "Identifier", name: "string", loc }, property: "char", loc },
              args: [{
                type: "BinaryExpression",
                operator: "-",
                left: { type: "Identifier", name: "ch", loc },
                right: { type: "BinaryExpression", operator: "+", left: { type: "Identifier", name: "k", loc }, right: { type: "Identifier", name: "i", loc }, loc },
                loc,
              }],
              loc,
            }],
            loc,
          },
        ],
      },
    ],
    elseBody: [
      {
        type: "AssignmentStatement",
        vars: [{ type: "IndexExpression", object: { type: "Identifier", name: "s", loc }, index: { type: "Identifier", name: "i", loc }, loc }],
        values: [{
          type: "CallExpression",
          callee: { type: "MemberExpression", object: { type: "Identifier", name: "string", loc }, property: "char", loc },
          args: [{
            type: "CallExpression",
            callee: { type: "MemberExpression", object: { type: "Identifier", name: "bit32", loc }, property: "bxor", loc },
            args: [{ type: "Identifier", name: "ch", loc }, { type: "Identifier", name: "k", loc }],
            loc,
          }],
          loc,
        }],
        loc,
      },
    ],
    loc,
  };

  (iterBody as Statement[]).push(ifSboxMode);

  decoderFuncBody.push({
    type: "ForNumericStatement",
    var: { type: "Identifier", name: "i", loc },
    start: { type: "NumberLiteral", value: "1", loc },
    end: {
      type: "UnaryExpression",
      operator: "#",
      argument: { type: "Identifier", name: "t", loc },
      loc,
    },
    body: iterBody as Statement[],
    loc,
  });

  decoderFuncBody.push({
    type: "LocalStatement",
    vars: [{ name: "res", type: undefined }],
    values: [{
      type: "CallExpression",
      callee: { type: "MemberExpression", object: { type: "Identifier", name: "table", loc }, property: "concat", loc },
      args: [{ type: "Identifier", name: "s", loc }],
      loc,
    }],
    loc,
  });

  if (useCrc8 && crcPoly !== undefined) {
    const crc8Result = createCrc8FunctionAst(crcPoly, loc);
    const crc8FuncName = crc8Result.name;
    const crc8FuncStmt = crc8Result.statement;

    decoderFuncBody.push({
      type: "LocalStatement",
      vars: [{ name: "crc_e", type: undefined }],
      values: [{
        type: "CallExpression",
        callee: { type: "MemberExpression", object: { type: "Identifier", name: "string", loc }, property: "byte", loc },
        args: [
          { type: "Identifier", name: "res", loc },
          { type: "UnaryExpression", operator: "#", argument: { type: "Identifier", name: "res", loc }, loc },
        ],
        loc,
      }],
      loc,
    });

    decoderFuncBody.push({
      type: "LocalStatement",
      vars: [{ name: "a", type: undefined }],
      values: [{
        type: "CallExpression",
        callee: { type: "MemberExpression", object: { type: "Identifier", name: "string", loc }, property: "sub", loc },
        args: [
          { type: "Identifier", name: "res", loc },
          { type: "NumberLiteral", value: "1", loc },
          {
            type: "BinaryExpression",
            operator: "-",
            left: { type: "UnaryExpression", operator: "#", argument: { type: "Identifier", name: "res", loc }, loc },
            right: { type: "NumberLiteral", value: "1", loc },
            loc,
          },
        ],
        loc,
      }],
      loc,
    });

    decoderFuncBody.push({
      type: "IfStatement",
      condition: {
        type: "BinaryExpression",
        operator: "~=",
        left: { type: "Identifier", name: "crc_e", loc },
        right: {
          type: "CallExpression",
          callee: { type: "Identifier", name: crc8FuncName, loc },
          args: [{ type: "Identifier", name: "a", loc }],
          loc,
        },
        loc,
      },
      thenBody: [
        {
          type: "ReturnStatement",
          values: [{
            type: "CallExpression",
            callee: {
              type: "MemberExpression",
              object: {
                type: "CallExpression",
                callee: { type: "MemberExpression", object: { type: "Identifier", name: "string", loc }, property: "char", loc },
                args: [{
                  type: "CallExpression",
                  callee: { type: "MemberExpression", object: { type: "Identifier", name: "math", loc }, property: "random", loc },
                  args: [
                    { type: "NumberLiteral", value: "0", loc },
                    { type: "NumberLiteral", value: "255", loc },
                  ],
                  loc,
                }],
                loc,
              },
              property: "rep",
              loc,
            },
            args: [{
              type: "CallExpression",
              callee: { type: "MemberExpression", object: { type: "Identifier", name: "math", loc }, property: "random", loc },
              args: [
                { type: "NumberLiteral", value: "1", loc },
                { type: "UnaryExpression", operator: "#", argument: { type: "Identifier", name: "a", loc }, loc },
              ],
              loc,
            }],
            loc,
          }],
          loc,
        },
      ],
      elseifClauses: [],
      elseBody: [],
      loc,
    });

    decoderFuncBody.push({
      type: "AssignmentStatement",
      vars: [{ type: "IndexExpression", object: { type: "Identifier", name: cacheName, loc }, index: { type: "Identifier", name: "t", loc }, loc }],
      values: [{ type: "Identifier", name: "a", loc }],
      loc,
    });

    decoderFuncBody.push({
      type: "ReturnStatement",
      values: [{ type: "Identifier", name: "a", loc }],
      loc,
    });

    const decoderFunc: Statement = {
      type: "LocalStatement",
      vars: [{ name: decoderName, type: undefined }],
      values: [{
        type: "FunctionExpression",
        params: [
          { type: "Param", name: "t", variadic: false, loc },
          { type: "Param", name: "k", variadic: false, loc },
          { type: "Param", name: "mode", variadic: false, loc },
        ],
        body: decoderFuncBody,
        loc,
      }],
      loc,
    };

    return [...sboxTableStmts, cacheStmt, crc8FuncStmt, decoderFunc];
  }

  decoderFuncBody.push({
    type: "AssignmentStatement",
    vars: [{ type: "IndexExpression", object: { type: "Identifier", name: cacheName, loc }, index: { type: "Identifier", name: "t", loc }, loc }],
    values: [{ type: "Identifier", name: "res", loc }],
    loc,
  });

  decoderFuncBody.push({
    type: "ReturnStatement",
    values: [{ type: "Identifier", name: "res", loc }],
    loc,
  });

  const decoderFunc: Statement = {
    type: "LocalStatement",
    vars: [{ name: decoderName, type: undefined }],
    values: [{
      type: "FunctionExpression",
      params: [
        { type: "Param", name: "t", variadic: false, loc },
        { type: "Param", name: "k", variadic: false, loc },
        { type: "Param", name: "mode", variadic: false, loc },
      ],
      body: decoderFuncBody,
      loc,
    }],
    loc,
  };

  return [...sboxTableStmts, cacheStmt, decoderFunc];
}

function transformExpression(
  exp: Expression,
  keys: number[],
  strategies: EncryptionStrategy[],
  decoderName: string,
  rng: () => number,
  useFragmentation: boolean,
  useCrc8?: boolean,
  crcPoly?: number
): Expression {
  if (exp.type === "StringLiteral") {
    if (exp.value === "") return exp;

    const strategy = strategies[Math.floor(rng() * strategies.length)];
    const key = keys[Math.floor(rng() * keys.length)];

    if (useFragmentation && exp.value.length > 4 && rng() > 0.5) {
      const { fragments, order } = fragmentString(exp.value, rng);
      const fragTables = fragments.map((frag) => {
        const fields: TableField[] = frag.map((b) => ({
          kind: "value" as const,
          value: { type: "NumberLiteral", value: String(b), loc: exp.loc },
        }));
        return {
          type: "TableConstructor",
          fields,
          loc: exp.loc,
        } as Expression;
      });

      const fragVar = `_f${Math.floor(rng() * 100000)}`;
      const mergeCode = `local ${fragVar}={}\nfor _fi=1,#${fragTables.map((_, i) => `_f${i}`).join("+#")} do `;

      const fragStmts: Statement[] = [];
      fragTables.forEach((tbl, i) => {
        const fn = `_f${i}`;
        fragStmts.push({
          type: "LocalStatement",
          vars: [{ name: fn, type: undefined }],
          values: [tbl],
          loc: exp.loc,
        });
      });

      const combinedExpr: Expression = fragTables.reduce((acc, tbl, i) => {
        const merged: Expression = {
          type: "CallExpression",
          callee: { type: "Identifier", name: decoderName, loc: exp.loc },
          args: [
            { type: "Identifier", name: `_f${i}`, loc: exp.loc },
            { type: "NumberLiteral", value: String(key), loc: exp.loc },
            { type: "StringLiteral", value: strategy, loc: exp.loc },
          ],
          loc: exp.loc,
        };
        if (i === 0) return merged;
        return {
          type: "BinaryExpression",
          operator: "..",
          left: acc,
          right: merged,
          loc: exp.loc,
        };
      });

      return {
        type: "ParenExpression",
        expression: (() => {
          let result: Expression = combinedExpr;
          for (let i = fragTables.length - 1; i >= 0; i--) {
            result = combinedExpr;
          }
          return result;
        })(),
        loc: exp.loc,
      };
    }

    let bytes: number[];
    if (strategy === "xor") {
      bytes = encodeStringXor(exp.value, key);
    } else if (strategy === "add-rotate") {
      bytes = encodeStringAddRotate(exp.value, key);
    } else if (strategy === "xor-chain") {
      bytes = encodeStringXorChain(exp.value, keys);
    } else {
      const sbox = generateSbox(rng);
      bytes = encodeStringSbox(exp.value, sbox);
    }

    if (useCrc8 && crcPoly !== undefined) {
      bytes.push(crc8(exp.value, crcPoly));
    }

    return makeDecodeCall(bytes, key, exp.loc, decoderName, strategy) as Expression;
  }

  if (exp.type === "BinaryExpression") {
    return {
      ...exp,
      left: transformExpression(exp.left, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
      right: transformExpression(exp.right, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
    };
  }
  if (exp.type === "UnaryExpression") {
    return { ...exp, argument: transformExpression(exp.argument, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) };
  }
  if (exp.type === "CallExpression") {
    return {
      ...exp,
      callee: transformExpression(exp.callee, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
      args: exp.args.map((a) => transformExpression(a, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
    };
  }
  if (exp.type === "MethodCallExpression") {
    return {
      ...exp,
      object: transformExpression(exp.object, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
      args: exp.args.map((a) => transformExpression(a, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
    };
  }
  if (exp.type === "IndexExpression") {
    return {
      ...exp,
      object: transformExpression(exp.object, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
      index: transformExpression(exp.index, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
    };
  }
  if (exp.type === "MemberExpression") {
    return { ...exp, object: transformExpression(exp.object, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) };
  }
  if (exp.type === "TableConstructor") {
    return {
      ...exp,
      fields: exp.fields.map((f) => {
        if (f.kind === "index")
          return { ...f, index: transformExpression(f.index, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly), value: transformExpression(f.value, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) };
        if (f.kind === "named")
          return { ...f, value: transformExpression(f.value, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) };
        return { ...f, value: transformExpression(f.value, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) };
      }),
    };
  }
  if (exp.type === "FunctionExpression") {
    return {
      ...exp,
      body: exp.body.map((s) => transformStatement(s, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
    };
  }
  if (exp.type === "ParenExpression") {
    return { ...exp, expression: transformExpression(exp.expression, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) };
  }
  if (exp.type === "TypeAssertion") {
    return { ...exp, expression: transformExpression(exp.expression, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) };
  }
  if (exp.type === "IfElseExpression") {
    return {
      ...exp,
      condition: transformExpression(exp.condition, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
      thenExp: transformExpression(exp.thenExp, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
      elseifClauses: exp.elseifClauses?.map((c) => ({
        ...c,
        condition: transformExpression(c.condition, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
        value: transformExpression(c.value, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
      })),
      elseExp: transformExpression(exp.elseExp, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
    };
  }
  if (exp.type === "StringInterpolation") {
    return {
      ...exp,
      parts: exp.parts.map((p) =>
        typeof p === "string" ? p : transformExpression(p, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)
      ),
    };
  }
  return exp;
}

function transformStatement(stmt: Statement | LastStatement, keys: number[], strategies: EncryptionStrategy[], decoderName: string, rng: () => number, useFragmentation: boolean, useCrc8?: boolean, crcPoly?: number): Statement | LastStatement {
  switch (stmt.type) {
    case "LocalStatement":
      return {
        ...stmt,
        values: stmt.values?.map((e) => transformExpression(e, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
      };
    case "AssignmentStatement":
      return {
        ...stmt,
        vars: stmt.vars.map((v) => {
          if (v.type === "Identifier") return v;
          if (v.type === "IndexExpression")
            return { ...v, object: transformExpression(v.object, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly), index: transformExpression(v.index, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) };
          return { ...v, object: transformExpression(v.object, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) };
        }),
        values: stmt.values.map((e) => transformExpression(e, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
      };
    case "CompoundAssignmentStatement":
      return {
        ...stmt,
        var: stmt.var.type === "Identifier" ? stmt.var : {
          ...stmt.var,
          object: transformExpression(stmt.var.object, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
          ...(stmt.var.type === "IndexExpression" && { index: transformExpression(stmt.var.index, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) }),
        },
        value: transformExpression(stmt.value, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
      };
    case "FunctionCallStatement":
      return { ...stmt, call: transformExpression(stmt.call, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) as CallExpression };
    case "ReturnStatement":
      return { ...stmt, values: stmt.values?.map((e) => transformExpression(e, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)) };
    case "IfStatement":
      return {
        ...stmt,
        condition: transformExpression(stmt.condition, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
        thenBody: stmt.thenBody.map((s) => transformStatement(s, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
        elseifClauses: stmt.elseifClauses?.map((c) => ({
          ...c,
          condition: transformExpression(c.condition, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
          body: c.body.map((s) => transformStatement(s, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
        })),
        elseBody: stmt.elseBody?.map((s) => transformStatement(s, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
      };
    case "ForNumericStatement":
      return {
        ...stmt,
        start: transformExpression(stmt.start, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
        end: transformExpression(stmt.end, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly),
        step: stmt.step ? transformExpression(stmt.step, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) : undefined,
        body: stmt.body.map((s) => transformStatement(s, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
      };
    case "ForInStatement":
      return {
        ...stmt,
        iter: stmt.iter.map((e) => transformExpression(e, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
        body: stmt.body.map((s) => transformStatement(s, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
      };
    case "LocalFunctionStatement":
    case "FunctionStatement":
      return {
        ...stmt,
        params: stmt.params,
        body: stmt.body.map((s) => transformStatement(s, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
      };
    case "DoStatement":
    case "WhileStatement":
    case "RepeatStatement":
      return {
        ...stmt,
        ...(stmt.type === "WhileStatement" && { condition: transformExpression(stmt.condition, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) }),
        ...(stmt.type === "RepeatStatement" && { condition: transformExpression(stmt.condition, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly) }),
        body: stmt.body.map((s) => transformStatement(s, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly)),
      };
    default:
      return stmt;
  }
}

export interface StringEncoderOptions {
  key?: number;
  enabled?: boolean;
  useFragmentation?: boolean;
  strategies?: EncryptionStrategy[];
  level?: number;
  crc8?: boolean;
}

export function encodeStrings(ast: Chunk, options: StringEncoderOptions = {}): Chunk {
  const enabled = options.enabled !== false;
  if (!enabled) return ast;

  const seed = options.key ?? 0x5A;
  const rng = createRng(seed);

  const strategies = options.strategies ?? (["xor", "add-rotate", "sbox"] as EncryptionStrategy[]);
  // Dynamic per-script key derivation: each script gets unique keys that vary per-string
  const baseKey = seed & 0xFF;
  const keyDerivation = [
    (i: number) => (baseKey + i * 0x1A + 0x3B) & 0xFF,
    (i: number) => (baseKey ^ (i * 0x3B) + 0x5C) & 0xFF,
    (i: number) => (~(baseKey + i * 0x5C) & 0xFF),
    (i: number) => ((baseKey << 1) ^ (i * 0x7D)) & 0xFF,
  ];
  // Generate key ring from multiple derivation functions
  const keys: number[] = [];
  for (let i = 0; i < 8; i++) {
    const kf = keyDerivation[i % keyDerivation.length];
    keys.push(kf(i));
  }
  // Add extra entropy from the seed
  keys.push((seed >> 8) & 0xFF, (seed >> 16) & 0xFF, (seed >> 24) & 0xFF);
  const useFragmentation = options.useFragmentation ?? true;
  const level = options.level ?? 2;
  const useCrc8 = options.crc8 !== false && level >= 3;
  const crcPoly = 0x07 | ((seed ^ (seed >> 8)) & 0xF8);

  const decoderName = `_uDec_${Math.random().toString(36).substring(2, 8)}`;
  const loc = ast.body[0]?.loc ?? { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } };

  const sboxTables: number[][] = [];
  for (let i = 0; i < 2; i++) {
    sboxTables.push(generateSbox(rng));
  }

  const decoders = makeDecoderStatements(strategies, keys, sboxTables, loc, decoderName, useCrc8, crcPoly);

  const transformedBody = ast.body.map((s) => transformStatement(s, keys, strategies, decoderName, rng, useFragmentation, useCrc8, crcPoly));

  return {
    ...ast,
    body: [...decoders, ...transformedBody],
  };
}
