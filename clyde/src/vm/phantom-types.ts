export const enum PhantomOp {
  NOP = 0,
  MOVE = 1,
  LOADK = 2,
  LOADNIL = 3,
  LOADBOOL = 4,
  GETGLOBAL = 5,
  SETGLOBAL = 6,
  GETTABLE = 7,
  SETTABLE = 8,
  NEWTABLE = 9,
  ADD = 10,
  SUB = 11,
  MUL = 12,
  DIV = 13,
  MOD = 14,
  POW = 15,
  UNM = 16,
  NOT = 17,
  LEN = 18,
  CONCAT = 19,
  JMP = 20,
  EQ = 21,
  LT = 22,
  LE = 23,
  TEST = 24,
  TESTSET = 25,
  CALL = 26,
  TAILCALL = 27,
  RETURN = 28,
  FORPREP = 29,
  FORLOOP = 30,
  TFORLOOP = 31,
  SETLIST = 32,
  CLOSURE = 33,
  VARARG = 34,
  GETUPVAL = 35,
  SETUPVAL = 36,
  CLOSEUPVAL = 37,
}

export const PHANTOM_OP_COUNT = 38;

export interface PhantomChunk {
  code: number[];
  K: (null | boolean | number | string)[];
  protos?: PhantomChunk[];
  maxRegs: number;
  nParams: number;
  isVararg: boolean;
  upvalues?: [number, number][];
}

export function phantomEmit(chunk: PhantomChunk, op: PhantomOp, A = 0, B = 0, C = 0): number {
  const pos = chunk.code.length;
  chunk.code.push(op, A, B, C);
  chunk.maxRegs = Math.max(chunk.maxRegs, A + 1);
  if (B < 256) chunk.maxRegs = Math.max(chunk.maxRegs, B + 1);
  if (C < 256) chunk.maxRegs = Math.max(chunk.maxRegs, C + 1);
  return pos;
}

export function phantomPatch(chunk: PhantomChunk, pc: number, field: 'A' | 'B' | 'C', value: number): void {
  const offset = field === 'A' ? 1 : field === 'B' ? 2 : 3;
  chunk.code[pc * 4 + offset] = value;
}

export function phantomPC(chunk: PhantomChunk): number {
  return Math.floor(chunk.code.length / 4);
}

export function phantomAddConst(chunk: PhantomChunk, value: null | boolean | number | string): number {
  const idx = chunk.K.indexOf(value);
  if (idx >= 0) return idx;
  chunk.K.push(value);
  return chunk.K.length - 1;
}

export function createPhantomChunk(): PhantomChunk {
  return { code: [], K: [], maxRegs: 0, nParams: 0, isVararg: false };
}

export const RK_OFFSET = 256;
export function RK(kIdx: number): number { return kIdx + RK_OFFSET; }
export function isRK(rk: number): boolean { return rk >= RK_OFFSET; }
export function rkToIdx(rk: number): number { return rk - RK_OFFSET; }
