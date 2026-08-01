/**
 * Roblox-targeted anti-debug.
 *
 * The classical anti-debug (AntiDebugInjector.ts) only checks the
 * standard `debug` library functions, which are 1) absent from
 * Roblox Luau entirely, and 2) not what Roblox executors actually
 * use to deobfuscate scripts. The real Roblox RE toolkit includes:
 *
 *   - getgenv, getrenv, getmenv, gettenv, getsenv, getnilinstances
 *   - getgc, getupvalue, getupvalues, getconstant, getconstants
 *   - hookfunction, hookmetamethod, replaceclosure, newcclosure
 *   - isourclosure, isexecutorclosure, checkcaller, checkclosure
 *   - setreadonly, setthreadidentity, getthreadidentity
 *   - getrawmetatable, setnamecallmethod
 *   - getreg, getgc, filtergc
 *   - identifyexecutor, getexecutorname
 *   - decompile, dumpstring
 *   - cache.replace, cache.iscached
 *   - WebSocket / WebHook hooks (e.g. hookfunction(hookfunction, ...))
 *
 * Per the Roblox dev-forum / r/robloxhackers write-ups, the typical
 * attack on an obfuscated script is:
 *   1. hookfunction(loadstring, function(s) return getupvalue or end)
 *      -- intercepts the bytecode the script would receive
 *   2. Or: hookmetamethod(game, "__namecall", function(...) ... end)
 *      -- intercepts calls
 *   3. Or: getupvalue(getupvalue(getreg(), "..."), "...") recursively
 *      -- pulls the bytecode out of VM upvalues
 *
 * Defense: at script load, do TWO things.
 *
 *   (a) DETECT — check if the well-known RE globals exist in `_G` /
 *       getgenv() / getrenv(). If any do, log them and abort.
 *
 *   (b) SABOTAGE — replace the RE tools with safe stubs that return
 *       the input unchanged (or a tagged "tamper" error). This means
 *       even if the executor loads our script and tries to use the
 *       tools to analyze it, the tools return useless results.
 *
 * The combination of (a) + (b) is what makes the Roblox-specific RE
 * toolkit ineffective against the script. We do NOT attempt to
 * defeat binary-level hooking (e.g. via DLL injection) because that
 * is a fundamentally different threat model — Roblox games use
 * Byfron/anti-tamper for that.
 *
 * Implementation notes:
 *
 *   - All lookups use pcall to avoid breaking on Roblox variants
 *     that don't expose every function.
 *   - The list of RE-tool names is curated from the actual Roblox
 *     executor documentation. Names are matched case-insensitively.
 *   - The script's "abort" function (set by the caller) is invoked
 *     on detection.
 */
export interface RobloxAntiDebugConfig {
    /** Names of RE-tool globals to detect and replace. */
    toolNames: string[];
    /** If true, replace detected tools with no-op stubs. Default: true. */
    sabotage: boolean;
    /** If true, run detection on getgenv()/getrenv() too. Default: true. */
    checkGetenv: boolean;
    /** The set of env tables to scan (default: [_G, getgenv, getrenv]). */
    envProbes: string[];
    /**
     * If true, also walk the global table recursively (one level deep)
     * looking for the tool names. This catches tools that are placed
     * in nested tables (e.g. syn.crypt.generate). Default: false (cost).
     */
    recursiveProbe: boolean;
}
/** The canonical list of Roblox RE-tool names, as of 2025. */
export declare const ROBOX_RE_TOOL_NAMES: string[];
/**
 * Generate the Lua source snippet that runs the Roblox anti-debug at
 * script load. Returns a string of Lua code to be spliced into the
 * output. The caller is responsible for providing the `abort` function
 * (which typically sets the VM state to bail out).
 */
export declare function emitRobloxAntiDebug(cfg: RobloxAntiDebugConfig, abortVarName: string, rng?: () => number): string;
//# sourceMappingURL=RobloxAntiDebug.d.ts.map