export declare function seedSoaRng(seed: number): void;
export interface SoaArray {
    I: number[];
    A: number[];
    B: number[];
    C: number[];
}
export declare function newSoa(): SoaArray;
export declare function soaEmit(soa: SoaArray, op: number, a: number, b: number, c: number): void;
export declare function soaFromFlatCode(code: number[], registerShuffle: boolean): SoaArray;
export declare function soaSerializeXor(soa: SoaArray, xk: number): string;
export declare function soaToFlat(soa: SoaArray): number[];
export declare function generateSoaLoader(soaVar: string, exportedVar: string): string;
export declare function generateSoABeautifyTrap(): string;
//# sourceMappingURL=soa-encoder.d.ts.map