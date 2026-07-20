import type { BytecodeChunk } from "./bytecode.js";
export declare function seedPolyRng(seed: number): void;
export interface PolymorphicOptions {
    enabled?: boolean;
    seed?: number;
    density?: number;
}
export declare function applyPolymorphicIR(chunk: BytecodeChunk, options?: PolymorphicOptions): BytecodeChunk;
export declare function generatePolymorphBootstrap(codeArrayName: string, ipName: string, regSlotName: string): string;
export declare function patchSubChunks(chunk: BytecodeChunk, options?: PolymorphicOptions): BytecodeChunk;
//# sourceMappingURL=polymorphic-ir.d.ts.map