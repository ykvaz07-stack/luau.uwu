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
  Op.NAMECALL,
]);

export interface PolymorphicOptions {
  enabled?: boolean;
  seed?: number;
  density?: number;
}

interface Patch {
  // The slot in the final code[] array that holds the real opcode.
  // (Computed as preludeLen + newCode-relative position.)
  finalPc: number;
  // The real opcode.
  realOp: number;
  // The real args (1-3 of them).
  realArgs: number[];
}

/**
 * Build the polymorphic IR transform.
 *
 * Strategy: replace some PATCHABLE_OPS instructions in chunk.code with NOP
 * placeholders. Prepend a "prelude" of STORE_CODE instructions that, at
 * runtime, overwrite each placeholder with its real opcode + real args.
 *
 * Because the prelude length is not known until we emit it, we do this in
 * two passes:
 *   1) Build the new code array (with NOP placeholders) and record each
 *      patch's position relative to newCode.
 *   2) Emit the prelude with placeholder target fields (= 0), then
 *      overwrite those target fields with the correct finalPc values
 *      (which depend on prelude length).
 *
 * STORE_CODE (Op.STORE_CODE = 57) is a runtime opcode that does
 *   code[targetIdx] = K[kIdx]
 * It must be handled in the VM dispatch (see vm-runner.ts).
 */
export function applyPolymorphicIR(
  chunk: BytecodeChunk,
  options: PolymorphicOptions = {},
): BytecodeChunk {
  const enabled = options.enabled !== false;
  if (!enabled) return chunk;

  const density = Math.min(1, Math.max(0, options.density ?? 0.4));

  // Pass 1: build newCode (with NOPs for patched ops) and record each patch's
  // newCode-relative position.
  const newCode: number[] = [];
  const patches: Patch[] = [];

  let i = 0;
  while (i < chunk.code.length) {
    const op = chunk.code[i];
    const ac = argCount(op);
    const args = chunk.code.slice(i + 1, i + 1 + ac);
    const ilen = 1 + ac;

    if (PATCHABLE_OPS.has(op) && rn() < density) {
      newCode.push(Op.NOP);
      for (let j = 0; j < ac; j++) newCode.push(0);

      patches.push({
        // Will be fixed up to the real final position once we know preludeLen.
        finalPc: newCode.length - ilen,
        realOp: op,
        realArgs: [...args],
      });
    } else {
      newCode.push(op, ...args);
    }
    i += ilen;
  }

  if (patches.length === 0) {
    if (chunk.protos) {
      for (const p of chunk.protos) applyPolymorphicIR(p, options);
    }
    return chunk;
  }

  // Pass 2a: emit the prelude (placeholder target = 0) and record each
  // STORE_CODE's target-field offset so we can patch it later. We do this in
  // a fresh code array, then prepend it to newCode in pass 3.
  const prelude: number[] = [];
  const targetFieldOffsets: number[] = [];

  for (const p of patches) {
    // Patch the opcode slot.
    const kIdx = addConst(chunk, p.realOp);
    const opSlot = prelude.length;
    prelude.push(Op.STORE_CODE, 0, kIdx); // placeholder target = 0
    targetFieldOffsets.push(opSlot + 1); // target field is at opSlot+1

    // Patch each arg slot.
    for (let ai = 0; ai < p.realArgs.length; ai++) {
      const argKIdx = addConst(chunk, p.realArgs[ai]);
      const argSlot = prelude.length;
      prelude.push(Op.STORE_CODE, 0, argKIdx);
      targetFieldOffsets.push(argSlot + 1);
    }
  }

  const preludeLen = prelude.length;
  // Now fix up the target fields with the real finalPc (preludeLen + relative).
  for (let pi = 0; pi < patches.length; pi++) {
    const p = patches[pi];
    const realPc = preludeLen + p.finalPc;
    // Patch opcode slot target.
    prelude[targetFieldOffsets[pi * (1 + p.realArgs.length)]] = realPc;
    // Patch each arg slot target.
    for (let ai = 0; ai < p.realArgs.length; ai++) {
      prelude[
        targetFieldOffsets[pi * (1 + p.realArgs.length) + 1 + ai]
      ] = realPc + 1 + ai;
    }
  }

  // Pass 3: replace chunk.code with [prelude, ...newCode].
  // We deliberately drop the original chunk.code contents — they are the
  // unpatched original, and the runtime will execute the prelude (which
  // patches newCode in place) and then the newCode.
  chunk.code = [...prelude, ...newCode];

  if (chunk.protos) {
    for (const p of chunk.protos) applyPolymorphicIR(p, options);
  }
  return chunk;
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
