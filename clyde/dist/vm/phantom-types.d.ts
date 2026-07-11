export declare const enum PhantomOp {
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
    CLOSEUPVAL = 37
}
export declare const PHANTOM_OP_COUNT = 38;
export interface PhantomChunk {
    code: number[];
    K: (null | boolean | number | string)[];
    protos?: PhantomChunk[];
    maxRegs: number;
    nParams: number;
    isVararg: boolean;
    upvalues?: [number, number][];
}
export declare function phantomEmit(chunk: PhantomChunk, op: PhantomOp, A?: number, B?: number, C?: number): number;
export declare function phantomPatch(chunk: PhantomChunk, pc: number, field: 'A' | 'B' | 'C', value: number): void;
export declare function phantomPC(chunk: PhantomChunk): number;
export declare function phantomAddConst(chunk: PhantomChunk, value: null | boolean | number | string): number;
export declare function createPhantomChunk(): PhantomChunk;
export declare const RK_OFFSET = 256;
export declare function RK(kIdx: number): number;
export declare function isRK(rk: number): boolean;
export declare function rkToIdx(rk: number): number;
//# sourceMappingURL=phantom-types.d.ts.map