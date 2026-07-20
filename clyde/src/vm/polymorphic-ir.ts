import type { BytecodeChunk } from "./bytecode.js";
import { Op, emit, addConst } from "./bytecode.js";

let _sng: () => number = Math.random;

export function seedPolyRng(seed: number): void {
  let s = seed | 0;
  _sng = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rn(): number { return _sng ? _sng() : Math.random(); }

function rname(len: number = 6): string {
  const p = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
  let s = "_";
  for (let i = 0; i < len; i++) s += p[Math.floor(rn() * p.length)];
  return s;
}

function hx(v: number): string {
  return "0x" + (v >>> 0).toString(16).toUpperCase();
}

const OPCODES_1ARG = new Set([
  4, 5, 6, 7, 8, 30, 31, 32, 33, 34, 35, 37, 38, 40, 41, 42, 43,
  44, 45, 47, 49, 50, 52, 54, 55, 65, 67
]);
const OPCODES_2ARG = new Set([39, 53, 60, 61, 66]);
const OPCODES_3ARG = new Set([56, 57, 58, 59, 62, 63]);

function argCount(op: number): number {
  return OPCODES_3ARG.has(op) ? 3 : OPCODES_2ARG.has(op) ? 2 : OPCODES_1ARG.has(op) ? 1 : 0;
}

function instrLen(op: number): number {
  return 1 + argCount(op);
}

const PATCHABLE_OPS = new Set([
  Op.PUSH_K, Op.LOAD_L, Op.STORE_L, Op.LOAD_G, Op.STORE_G,
  Op.GET_TABLE, Op.SET_TABLE, Op.CALL, Op.CALL_MULTI,
  Op.NAMECALL, Op.GET_TABLE
]);

export interface PolymorphicOptions {
  enabled?: boolean;
  seed?: number;
  density?: number;
}

export function applyPolymorphicIR(
  chunk: BytecodeChunk,
  options: PolymorphicOptions = {},
): BytecodeChunk {
  const enabled = options.enabled !== false;
  if (!enabled) return chunk;

  const density = Math.min(1, Math.max(0, options.density ?? 0.4));

  const newCode: number[] = [];
  const patches: Array<{
    targetPc: number;
    realOp: number;
    realArgs: number[];
  }> = [];

  let i = 0;
  while (i < chunk.code.length) {
    const op = chunk.code[i];
    const ac = argCount(op);
    const args = chunk.code.slice(i + 1, i + 1 + ac);
    const ilen = 1 + ac;

    if (PATCHABLE_OPS.has(op) && rn() < density) {

      const placeholderOp = Op.NOP;
      newCode.push(placeholderOp);
      for (let j = 0; j < ac; j++) newCode.push(0);

      patches.push({
        targetPc: newCode.length - ilen,
        realOp: op,
        realArgs: [...args],
      });
    } else {

      newCode.push(op, ...args);
    }
    i += ilen;
  }

  const preludeCode: number[] = [];
  for (const patch of patches) {

    preludeCode.push(Op.LOAD_L, patch.targetPc, 0, 0);

    const tempReg = 0;
    emitKLoad(preludeCode, tempReg, patch.realOp);
    preludeCode.push(Op.STORE_G, patch.targetPc, 0);

    for (let ai = 0; ai < patch.realArgs.length; ai++) {
      emitKLoad(preludeCode, tempReg, patch.realArgs[ai]);
      preludeCode.push(Op.STORE_G, patch.targetPc + 1 + ai, 0);
    }
  }

  chunk.code = [...preludeCode, ...newCode];
  return chunk;
}

function emitKLoad(code: number[], reg: number, value: number): void {
  code.push(Op.PUSH_K, reg, 0, 0);
}

export function generatePolymorphBootstrap(
  codeArrayName: string,
  ipName: string,
  regSlotName: string,
): string {
  const nPatch = rname(4);
  const nIdx = rname(2);
  const nVal = rname(2);
  const nMut = rname(4);
  const nMutH = rname(3);

  const lines: string[] = [
    `local ${nPatch}=function(${nIdx},${nVal}) ${codeArrayName}[${nIdx}]=${nVal} end`,
    `local ${nMutH}=function() local _o=${codeArrayName}[${ipName}] local _v=${codeArrayName}[${ipName}+1] if _o==0 and _v~=0 then ${codeArrayName}[${ipName}]=_v ${ipName}=${ipName}+1 end end`,
    `local ${nMut}=${nMutH}`,
  ];
  return lines.join("\n");
}

export function patchSubChunks(
  chunk: BytecodeChunk,
  options: PolymorphicOptions = {},
): BytecodeChunk {
  applyPolymorphicIR(chunk, options);
  if (chunk.protos) {
    for (const p of chunk.protos) {
      patchSubChunks(p, options);
    }
  }
  return chunk;
}