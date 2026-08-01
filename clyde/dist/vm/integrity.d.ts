/**
 * HMAC-style integrity over the bytecode blob.
 *
 * The classical "self-hash" approach (Luraph v13.6+, Ironbrew, etc.)
 * computes a checksum of the bytecode and bails if it doesn't match.
 * This is trivially defeated: an attacker patches the bytecode and
 * patches the integrity check in the same edit.
 *
 * We use an HMAC-style approach instead: the integrity check
 * consumes a key that the inner VM *also* uses to make decisions
 * (e.g., the math-dispatch polynomial `a` coefficient, the cipher
 * key, or the S-Box). Patching the bytecode without knowing the key
 * results in a script that runs but produces wrong outputs (or, with
 * probability proportional to the number of integrity check points,
 * aborts).
 *
 * The HMAC is computed at build time as:
 *   hmac = ((bytecode[i] * (key[i % keylen] + 1)) rolled into 32 bits)
 *
 * The key is derived from per-build constants that the runtime
 * cannot easily reveal. The integrity check is embedded in the
 * inner VM (where patching requires understanding the VM), not in
 * the outer bootstrap (where it's trivially patchable).
 *
 * We also implement a "moving target" integrity check: the key
 * itself is recomputed at every Nth instruction based on the
 * instruction pointer and a per-build PRNG seed, so the attacker
 * can't predict which bytes will be checked.
 */
export interface IntegrityConfig {
    /** Key length in bytes (3..16). Longer keys are slower to compute. */
    keyLen: number;
    /** Key bytes, in [1, 255] (0 is a weak multiplier). */
    key: number[];
    /** Every Nth instruction triggers an integrity check. */
    checkEvery: number;
    /** The expected HMAC tag for the bytecode, as an unsigned 32-bit int. */
    tag: number;
    /** The base seed for the moving-target key evolution. */
    moveSeed: number;
    /** The multiplier for the moving-target key evolution. */
    moveMul: number;
}
/**
 * Compute an HMAC-style tag over `data` using `key`. The tag is an
 * unsigned 32-bit integer that fits in a Lua number.
 *
 * Algorithm: tag = sum over i of (data[i] * (key[i % keylen] + 1))
 * with overflow folding at 2^32.
 *
 * This is a weak HMAC (it doesn't have the security properties of a
 * real HMAC) but it's good enough for tamper-detection: an attacker
 * who patches bytecode must also recompute the tag, and the tag is
 * used as a runtime input to the inner VM (so a wrong tag produces
 * a wrong output or abort, depending on how it's wired in).
 */
export declare function computeIntegrityTag(data: number[], key: number[]): number;
/**
 * Generate a per-build integrity config. The key is random bytes, the
 * tag is the HMAC over the bytecode, the check-interval is chosen
 * to balance security (more frequent = better) and performance (less
 * frequent = faster).
 */
export declare function buildIntegrityConfig(bytecode: number[], rng: () => number, opts?: {
    keyLen?: number;
    minInterval?: number;
    maxInterval?: number;
}): IntegrityConfig;
/**
 * Evolve the integrity key based on the current instruction pointer.
 * This is the "moving target" — at every integrity check, the key
 * bytes are updated based on ip, so an attacker can't pre-compute
 * the key for a future check.
 *
 * At runtime, the equivalent code is:
 *   for i = 0, keyLen-1 do
 *     key[i] = (key[i] * mul + ip + seed) & 0xFF
 *   end
 */
export declare function evolveKey(key: number[], ip: number, seed: number, mul: number): void;
/**
 * Recompute the integrity tag over a slice of the bytecode. Used at
 * runtime to verify a portion of the bytecode matches the expected
 * HMAC. The slice is `[from, to)`; the key is the *current* state
 * after evolveKey has been called checkEvery times.
 */
export declare function recomputeTag(bytecode: number[], from: number, to: number, key: number[]): number;
/**
 * Generate a Lua source snippet that, given the current bytecode
 * array, the per-build key array, and the expected tag, verifies
 * the integrity of a slice and aborts on mismatch.
 *
 * The emitted code uses `bit32` ops when available, with a Lua
 * 5.1-style fallback. The key array is provided as a list of
 * integer literals; in the calling code you should embed the key
 * as randomized integer literals to avoid making it easy to find.
 */
export declare function emitIntegrityCheck(cfg: IntegrityConfig, fromPc: number, toPc: number, byteCodeVar: string, keyVar: string, ipVar: string, abortVar: string, useBit32?: boolean): string;
/**
 * Validate a config: ensures all key bytes are in [1, 255], the
 * keyLen matches, etc. Used in tests.
 */
export declare function validateIntegrityConfig(cfg: IntegrityConfig): string | null;
//# sourceMappingURL=integrity.d.ts.map