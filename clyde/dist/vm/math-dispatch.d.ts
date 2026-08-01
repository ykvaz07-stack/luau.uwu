/**
 * Mathematical opcode dispatch.
 *
 * The classical VM dispatch loop looks like:
 *     while ip < #code do
 *         local op = code[ip]
 *         if op == OP_LOADK then ... end
 *         elseif op == OP_ADD then ... end
 *         ...
 *
 * The visible integer comparisons are exactly the attack surface that the
 * birk.blog "Lua Virtualization Part 5" writeup, the vfxecho toolkit, and
 * the PhoenixZeng LuraphDeobfuscator all hook to dump the instruction
 * stream. Hooking one of these comparisons and logging the second
 * argument (the opcode integer) reveals the full program.
 *
 * Mathematical dispatch defeats this by making the dispatch comparison
 * itself a per-build arithmetic identity. For each opcode N in the
 * current set, we compute a unique residue R_N under a per-build
 * polynomial f(x) = (a*x + b) mod p, where p is a 31-bit prime. The
 * dispatch then becomes:
 *
 *     local f = (a*op + b) % p
 *     if f == R_OP_LOADK then ... end
 *     elseif f == R_OP_ADD then ... end
 *     ...
 *
 * To recover the original opcodes, an attacker has to:
 *   1. Find a, b, p by examining the runtime (the constants appear in
 *      the generated source, but a, b are stored as 31-bit integers
 *      that the attacker has to factor through the constant pool).
 *   2. Compute the modular inverse of a mod p.
 *   3. For each observed residue R, compute (R - b) * a^{-1} mod p to
 *      recover the original opcode.
 *
 * This is significantly harder than reading a plain integer from the
 * dispatch, and is the same general technique used by RoxGuard, modern
 * Luraph builds, and recent commercial Java/JS obfuscators.
 *
 * The implementation is also designed to be portable: a, b, p are all
 * small enough to fit in a 32-bit signed integer, the multiplication
 * a*op is well within range of bit32 multiplication, and the modulo
 * operation is implemented as a positive-result mod that doesn't depend
 * on the sign of the dividend (which is important for Roblox's
 * truncated-toward-zero integer division semantics).
 */
export interface MathDispatchConfig {
    /** a coefficient of the polynomial f(x) = (a*x + b) mod p */
    a: number;
    /** b coefficient of the polynomial f(x) = (a*x + b) mod p */
    b: number;
    /** Modulus (a 31-bit prime, > REG_OPCODE_COUNT) */
    p: number;
    /**
     * For each opcode n in [0, opcodeCount), the residue R_n such that
     * (a * n + b) mod p == R_n. The dispatch compares f(op) to R_n.
     */
    residues: number[];
}
/**
 * Build a math-dispatch config for the given opcode set. Picks a random
 * 31-bit prime p > opcodeCount, a random a coprime to p, and a random b.
 * Then computes residues for every opcode in [0, opcodeCount).
 *
 * The function is deterministic given a seed; pass it to your RNG.
 */
export declare function buildMathDispatch(opcodeCount: number, rng?: () => number): MathDispatchConfig;
/**
 * Inverse of a mod p, computed via the extended Euclidean algorithm.
 * Returns a number in [0, p) such that (a * inv) mod p == 1.
 *
 * Used at build time only to verify the dispatch is correct; not
 * exposed in the generated VM.
 *
 * Implementation note: the intermediate values (old_r - q * r) can
 * grow large, and JS numbers lose precision past 2^53. We use BigInt
 * internally to keep the result exact, then convert back to a Number
 * for the final residue.
 */
export declare function modInverse32(a: number, p: number): number;
/**
 * Validate that a math-dispatch config actually produces distinct
 * residues for all opcodes in [0, opcodeCount).
 *
 * Returns null on success, or a description of the collision on
 * failure (which would make the dispatch ambiguous).
 */
export declare function validateMathDispatch(cfg: MathDispatchConfig, opcodeCount: number): string | null;
/**
 * Emit a Lua source snippet that, given the current code[ip] value in
 * a variable named `opVar`, computes the polynomial residue and stores
 * it in a new variable. Returns the variable name.
 *
 * We use bit32 ops when available for performance; the bootstrap
 * template handles the fallback. For maximum portability the emitted
 * code uses raw `*` and `%` (which work in all Lua 5.1+ dialects and
 * Luau) with explicit positive-result normalization to handle Roblox
 * Luau's truncated-toward-zero division.
 */
export declare function emitMathDispatch(cfg: MathDispatchConfig, opVar: string, bxorVar: string | null, varPrefix?: string): {
    residueVar: string;
    luaExpr: string;
};
/**
 * Generate a list of dispatch comparisons, one per opcode, in the form
 *   [opcodeNumber, residueValue, bodySource]
 * The caller emits the actual `if` / `elseif` chain using these.
 */
export interface DispatchEntry {
    opcode: number;
    residue: number;
}
export declare function buildDispatchEntries(cfg: MathDispatchConfig, opcodeCount: number): DispatchEntry[];
//# sourceMappingURL=math-dispatch.d.ts.map