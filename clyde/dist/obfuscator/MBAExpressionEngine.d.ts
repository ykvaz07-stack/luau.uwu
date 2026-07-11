import type { Expression } from "../ast/types.js";
import type { SourceLocation } from "../tokens.js";
export interface MBAConfig {
    depth?: number;
    seed?: number;
}
export declare class MBAEngine {
    private rng;
    private seed;
    constructor(config?: MBAConfig);
    private createRng;
    private randInt;
    obfuscateNumber(n: number, loc?: SourceLocation): Expression;
    obfuscateNumberWithBitops(n: number, loc?: SourceLocation): Expression;
    createOpaquePredicate(loc?: SourceLocation): {
        condition: Expression;
        expected: boolean;
    };
    createAntiDSEPredicate(loc?: SourceLocation): Expression;
}
//# sourceMappingURL=MBAExpressionEngine.d.ts.map