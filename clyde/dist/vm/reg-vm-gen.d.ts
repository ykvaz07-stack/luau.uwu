import type { RegBytecodeChunk } from "./bytecode.js";
export type RegVMLevel = "debug" | "normal" | "max";
export type RegVMLevelInput = RegVMLevel | "maximum";
export type RegFeatureFlag = "opcodeShuffle" | "stringEncoding" | "constantFolding" | "minification" | "fakeHandlers" | "handlerNoise" | "antiDebug" | "antiTamper" | "controlFlowFlattening" | "opcodeFusion" | "deadCodeInjection" | "syntaxInterpreter" | "customCipher" | "stubCompression" | "vmNesting" | "staticEnvironment" | "debuggerDetection" | "bytecodeCompression" | "targetVersionPinning";
export interface RegVMGenOptions {
    level?: RegVMLevelInput;
    executorGlobals?: boolean;
    polymorphicSeed?: number;
    disableFeatures?: RegFeatureFlag[];
    forceFeatures?: RegFeatureFlag[];
    debugTrace?: boolean;
    _noWatermark?: boolean;
    /**
     * Per-customer forensic watermark. If set, the watermark string
     * is embedded in the bytecode as a recoverable tag (the obfuscator
     * can extract it from any shipped script to identify which customer
     * the script was issued to). This is a differentiator Luraph
     * doesn't offer — if a leaked script is found, the owner can
     * determine the leaker.
     *
     * The watermark is stored as a series of XOR-encoded bytes in a
     * constant pool slot, plus a recovery routine that runs on the
     * first instruction. It's recoverable by anyone with the obfus-
     * cator's tool, but indistinguishable from "noise bytes" to a
     * reverse engineer who doesn't know the format.
     */
    watermark?: string;
    target?: string;
}
export declare function generateRegVM(chunk: RegBytecodeChunk, options?: RegVMGenOptions): string;
//# sourceMappingURL=reg-vm-gen.d.ts.map