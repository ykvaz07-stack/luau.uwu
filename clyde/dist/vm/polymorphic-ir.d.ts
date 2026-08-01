import type { BytecodeChunk } from "./bytecode.js";
export declare function seedPolyRng(seed: number): void;
export interface PolymorphicOptions {
    enabled?: boolean;
    seed?: number;
    density?: number;
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
export declare function applyPolymorphicIR(chunk: BytecodeChunk, options?: PolymorphicOptions): BytecodeChunk;
export declare function generatePolymorphBootstrap(codeArrayName: string, ipName: string, regSlotName: string): string;
export declare function patchSubChunks(chunk: BytecodeChunk, options?: PolymorphicOptions): BytecodeChunk;
//# sourceMappingURL=polymorphic-ir.d.ts.map