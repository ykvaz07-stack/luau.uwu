export const PHANTOM_OP_COUNT = 38;
export function phantomEmit(chunk, op, A = 0, B = 0, C = 0) {
    const pos = chunk.code.length;
    chunk.code.push(op, A, B, C);
    chunk.maxRegs = Math.max(chunk.maxRegs, A + 1);
    if (B < 256)
        chunk.maxRegs = Math.max(chunk.maxRegs, B + 1);
    if (C < 256)
        chunk.maxRegs = Math.max(chunk.maxRegs, C + 1);
    return pos;
}
export function phantomPatch(chunk, pos, field, value) {
    const offset = field === 'A' ? 1 : field === 'B' ? 2 : 3;
    chunk.code[pos + offset] = value;
}
export function phantomPC(chunk) {
    return Math.floor(chunk.code.length / 4);
}
export function phantomAddConst(chunk, value) {
    const idx = chunk.K.indexOf(value);
    if (idx >= 0)
        return idx;
    chunk.K.push(value);
    return chunk.K.length - 1;
}
export function createPhantomChunk() {
    return { code: [], K: [], maxRegs: 0, nParams: 0, isVararg: false };
}
export const RK_OFFSET = 256;
export function RK(kIdx) { return kIdx + RK_OFFSET; }
export function isRK(rk) { return rk >= RK_OFFSET; }
export function rkToIdx(rk) { return rk - RK_OFFSET; }
//# sourceMappingURL=phantom-types.js.map