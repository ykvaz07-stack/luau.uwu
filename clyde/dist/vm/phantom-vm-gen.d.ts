import type { PhantomChunk } from "./phantom-types.js";
export interface PhantomGenOptions {
    level?: "min" | "normal" | "max";
    seed?: number;
    antiDebug?: boolean;
}
export declare function generatePhantomVM(chunk: PhantomChunk | {
    code: number[];
    K: any[];
    protos?: any[];
    maxRegs: number;
    nParams: number;
    isVararg: boolean;
}, options?: PhantomGenOptions): string;
//# sourceMappingURL=phantom-vm-gen.d.ts.map