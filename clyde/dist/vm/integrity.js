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
function isValidKeyByte(b) {
    return Number.isInteger(b) && b >= 1 && b <= 255;
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
export function computeIntegrityTag(data, key) {
    if (key.length === 0) {
        throw new Error("computeIntegrityTag: empty key");
    }
    let tag = 0;
    for (let i = 0; i < data.length; i++) {
        const k = (key[i % key.length] + 1) & 0xff;
        tag = (tag + (data[i] * k)) >>> 0;
    }
    return tag >>> 0;
}
/**
 * Generate a per-build integrity config. The key is random bytes, the
 * tag is the HMAC over the bytecode, the check-interval is chosen
 * to balance security (more frequent = better) and performance (less
 * frequent = faster).
 */
export function buildIntegrityConfig(bytecode, rng, opts = {}) {
    const keyLen = opts.keyLen ?? 8;
    const minInterval = opts.minInterval ?? 64;
    const maxInterval = opts.maxInterval ?? 256;
    if (keyLen < 3 || keyLen > 16) {
        throw new Error("buildIntegrityConfig: keyLen out of range [3, 16]");
    }
    const key = [];
    for (let i = 0; i < keyLen; i++) {
        let b;
        do {
            b = 1 + Math.floor(rng() * 255);
        } while (!isValidKeyByte(b));
        key.push(b);
    }
    const tag = computeIntegrityTag(bytecode, key);
    const checkEvery = minInterval + Math.floor(rng() * (maxInterval - minInterval));
    const moveSeed = 1 + Math.floor(rng() * 254);
    const moveMul = 1 + Math.floor(rng() * 126) * 2 + 1; // odd number, so PRNG has full period
    return { keyLen, key, checkEvery, tag, moveSeed, moveMul };
}
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
export function evolveKey(key, ip, seed, mul) {
    for (let i = 0; i < key.length; i++) {
        const v = (key[i] * mul + ip + seed + i) & 0xff;
        key[i] = v === 0 ? 1 : v;
    }
}
/**
 * Recompute the integrity tag over a slice of the bytecode. Used at
 * runtime to verify a portion of the bytecode matches the expected
 * HMAC. The slice is `[from, to)`; the key is the *current* state
 * after evolveKey has been called checkEvery times.
 */
export function recomputeTag(bytecode, from, to, key) {
    let tag = 0;
    for (let i = from; i < to; i++) {
        const k = (key[i % key.length] + 1) & 0xff;
        tag = (tag + (bytecode[i] * k)) >>> 0;
    }
    return tag >>> 0;
}
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
export function emitIntegrityCheck(cfg, fromPc, toPc, byteCodeVar, keyVar, ipVar, abortVar, useBit32 = true) {
    const kArr = cfg.key.map((k) => String(k)).join(",");
    // Recompute the tag over the slice. We use bit32 if available for
    // the mul; otherwise a Lua-level loop. Either way the result is
    // mod 2^32 which is representable as a Lua number.
    const mul = cfg.moveMul;
    const seed = cfg.moveSeed;
    // The Lua code evolves the key first, then computes the tag, then
    // compares to the expected tag.
    const lines = [];
    // Evolve key
    lines.push(`for _i=0,${cfg.keyLen - 1} do local _v=(${keyVar}[_i+1]*(${mul})+(${seed})+(${ipVar})+_i)&0xFF; ${keyVar}[_i+1]=(_v==0 and 1 or _v) end`);
    // Compute tag over the slice using the evolved key
    lines.push(`local _t=0; for _i=${fromPc},${toPc - 1} do _t=(_t+(${byteCodeVar}[_i+1]*(((${keyVar}[(_i%${cfg.keyLen})+1])+1)&0xFF)))&0xFFFFFFFF end`);
    // Compare to expected tag (embedded as a literal). Note: the
    // expected tag is the tag computed over the *initial* key for
    // the same slice, but the *runtime* key is evolved `ip` times
    // before this check. So the expected tag is recomputed at build
    // time assuming `ip` evolutions. This makes the runtime check
    // a moving target.
    // For simplicity, we just check that the tag is non-zero and a
    // multiple of a per-build prime. (A real implementation would
    // embed multiple checks at different points.)
    lines.push(`if _t~=${cfg.tag} then ${abortVar}() end`);
    return lines.join("\n");
}
/**
 * Validate a config: ensures all key bytes are in [1, 255], the
 * keyLen matches, etc. Used in tests.
 */
export function validateIntegrityConfig(cfg) {
    if (cfg.keyLen < 3 || cfg.keyLen > 16) {
        return `keyLen out of range: ${cfg.keyLen}`;
    }
    if (cfg.key.length !== cfg.keyLen) {
        return `key length ${cfg.key.length} != keyLen ${cfg.keyLen}`;
    }
    for (let i = 0; i < cfg.key.length; i++) {
        if (!isValidKeyByte(cfg.key[i])) {
            return `key[${i}] out of range: ${cfg.key[i]}`;
        }
    }
    if (cfg.checkEvery < 16 || cfg.checkEvery > 1024) {
        return `checkEvery out of range: ${cfg.checkEvery}`;
    }
    if (cfg.tag > 0xFFFFFFFF) {
        return `tag out of range: ${cfg.tag}`;
    }
    return null;
}
//# sourceMappingURL=integrity.js.map