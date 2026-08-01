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
// 16-bit primes in the range (2^8, 2^16). All values are verified
// prime at module load. We use 16-bit primes so that the polynomial
// a*op can be computed exactly in 32-bit double-precision arithmetic
// (since both a and op are < 2^16, the product fits in 2^32 which is
// exactly representable in JS doubles). Larger primes would force
// lossy 64-bit products and break the dispatch.
//
// We only need 16 bits because we have at most ~100 opcodes. Even
// 257 (a 9-bit prime) would be enough; 16 bits gives us generous
// headroom and a large enough code space that 100 residues are
// spread out across ~32k possible residues.
const SAFE_PRIMES_16_CACHE = [];
function populateSafePrimes() {
    if (SAFE_PRIMES_16_CACHE.length > 0)
        return;
    // 16-bit range: [257, 65535]. We sample candidates deterministically
    // (odd numbers only) and primality-check them.
    for (let p = 0x101; p < 0xFFFF; p += 2) {
        if (isPrime16(p))
            SAFE_PRIMES_16_CACHE.push(p);
        if (SAFE_PRIMES_16_CACHE.length >= 20)
            break;
    }
}
function isPrime16(n) {
    if (n < 2)
        return false;
    if (n % 2 === 0)
        return n === 2;
    const r = Math.floor(Math.sqrt(n));
    for (let i = 3; i <= r; i += 2) {
        if (n % i === 0)
            return false;
    }
    return true;
}
function isPrime32(n) {
    return isPrime16(n);
}
/**
 * Build a math-dispatch config for the given opcode set. Picks a random
 * 31-bit prime p > opcodeCount, a random a coprime to p, and a random b.
 * Then computes residues for every opcode in [0, opcodeCount).
 *
 * The function is deterministic given a seed; pass it to your RNG.
 */
export function buildMathDispatch(opcodeCount, rng = Math.random) {
    if (opcodeCount < 2) {
        throw new Error("math-dispatch requires at least 2 opcodes");
    }
    // Pick a 16-bit prime p that is comfortably larger than opcodeCount
    // so the residues are all distinct.
    populateSafePrimes();
    let p;
    do {
        p = SAFE_PRIMES_16_CACHE[Math.floor(rng() * SAFE_PRIMES_16_CACHE.length)];
    } while (p <= opcodeCount);
    if (!isPrime16(p)) {
        // Should be impossible since populateSafePrimes verifies, but defensive.
        throw new Error("internal error: non-prime p");
    }
    // Pick a coprime a in [1, p-1]. We use rejection sampling.
    let a;
    do {
        a = 1 + Math.floor(rng() * (p - 1));
    } while (gcd32(a, p) !== 1);
    // Pick any b in [0, p-1].
    const b = Math.floor(rng() * p);
    // Compute residues. The product a*n is < 2^32 so it's exactly
    // representable in JS doubles (and in Lua's doubles); the mod is
    // then safe and exact.
    const residues = new Array(opcodeCount);
    for (let n = 0; n < opcodeCount; n++) {
        let r = ((a * n + b) % p + p) % p; // positive mod
        residues[n] = r;
    }
    return { a, b, p, residues };
}
function gcd32(a, b) {
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return Math.abs(a);
}
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
export function modInverse32(a, p) {
    // Extended Euclidean algorithm using BigInt for exact arithmetic.
    let oldR = BigInt(a);
    let r = BigInt(p);
    let oldS = 1n;
    let s = 0n;
    const pBig = r;
    while (r !== 0n) {
        const q = oldR / r;
        [oldR, r] = [r, oldR - q * r];
        [oldS, s] = [s, oldS - q * s];
    }
    // oldR is gcd(a, p), should be 1.
    // oldS is the inverse; may be negative, normalize.
    let inv = oldS % pBig;
    if (inv < 0n)
        inv += pBig;
    // Safe to convert to Number since p < 2^31.
    return Number(inv);
}
/**
 * Validate that a math-dispatch config actually produces distinct
 * residues for all opcodes in [0, opcodeCount).
 *
 * Returns null on success, or a description of the collision on
 * failure (which would make the dispatch ambiguous).
 */
export function validateMathDispatch(cfg, opcodeCount) {
    const seen = new Map();
    for (let n = 0; n < opcodeCount; n++) {
        const r = cfg.residues[n];
        if (r < 0 || r >= cfg.p) {
            return `residue for opcode ${n} is out of range: ${r}`;
        }
        if (seen.has(r)) {
            return `residue collision: opcode ${n} and opcode ${seen.get(r)} both map to ${r}`;
        }
        seen.set(r, n);
    }
    // Sanity: verify the inverse is correct.
    const inv = modInverse32(cfg.a, cfg.p);
    // Use BigInt to avoid float-precision issues for large products.
    const product = (BigInt(cfg.a) * BigInt(inv)) % BigInt(cfg.p);
    if (product !== 1n) {
        return "internal error: bad modular inverse";
    }
    return null;
}
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
export function emitMathDispatch(cfg, opVar, bxorVar, varPrefix = "_md") {
    const residueVar = `${varPrefix}_r`;
    // If the dispatch is using bxor (from the shuffled dispatch
    // variant), we fold the bxor into the polynomial. The bxor acts as
    // a per-build one-time-pad; combined with the polynomial it gives
    // us two independent unknowns to recover.
    if (bxorVar) {
        // f(op) = (a * (op XOR pad) + b) mod p
        const luaExpr = `((((${cfg.a})*(${bxorVar}))+${cfg.b})%(${cfg.p})+(${cfg.p}))%(${cfg.p})`;
        return { residueVar, luaExpr };
    }
    const luaExpr = `(((${cfg.a})*(${opVar})+${cfg.b})%(${cfg.p})+(${cfg.p}))%(${cfg.p})`;
    return { residueVar, luaExpr };
}
export function buildDispatchEntries(cfg, opcodeCount) {
    const out = [];
    for (let n = 0; n < opcodeCount; n++) {
        out.push({ opcode: n, residue: cfg.residues[n] });
    }
    return out;
}
//# sourceMappingURL=math-dispatch.js.map