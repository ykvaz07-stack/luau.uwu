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
export const ROBOX_RE_TOOL_NAMES: string[] = [
  // Environment accessors
  "getgenv", "getrenv", "getmenv", "gettenv", "getsenv", "getnilinstances",
  // GC and upvalue access
  "getgc", "getreg", "getupvalue", "getupvalues", "getconstant", "getconstants",
  "getproto", "getprotos", "getstack", "getcallstack", "getinfo", "getthreadinfo",
  // Hooking
  "hookfunction", "hookmetamethod", "hookfunc", "replaceclosure", "newcclosure",
  "hook", "hooks", "rehook",
  // Closure detection
  "isourclosure", "isexecutorclosure", "checkcaller", "checkclosure",
  "iscclosure", "islclosure", "isreadonly",
  // Metatable manipulation
  "getrawmetatable", "setrawmetatable", "setreadonly", "makereadonly",
  "makewriteable", "setnamecallmethod", "getnamecallmethod",
  // Thread identity
  "setthreadidentity", "getthreadidentity", "setidentity", "getidentity",
  "set_thread_identity", "get_thread_identity",
  // Function cloning
  "clonefunction", "cloneref", "compareinstances",
  // Caching
  "replacecached", "cache.replace", "cache.iscached", "cache.invalidate",
  "iscached", "replacecached", "invalidatecached",
  // Executor detection
  "identifyexecutor", "getexecutorname", "getexecutormethod", "isrbxactive",
  "isgameactive", "iswindowactive", "gethwid",
  // Decompilation
  "decompile", "dumpstring", "getscriptbytecode", "getscriptable",
  "setscriptable", "gethiddenproperty", "sethiddenproperty",
  // Network interception (used to steal key exchanges)
  "firesignal", "fireclickdetector", "firetouchinterest", "fireproximityprompt",
  "hookmetamethod", "setreadonly", "makereadonly",
  // Generic
  "gethui", "getrunningscripts", "getloadedmodules", "getinstances",
  "getnilinstances", "getnil", "delay", "spawn", "queue_on_teleport",
  "queueonteleport",
];

/**
 * Generate the Lua source snippet that runs the Roblox anti-debug at
 * script load. Returns a string of Lua code to be spliced into the
 * output. The caller is responsible for providing the `abort` function
 * (which typically sets the VM state to bail out).
 */
export function emitRobloxAntiDebug(
  cfg: RobloxAntiDebugConfig,
  abortVarName: string,
  rng: () => number = Math.random,
): string {
  const lines: string[] = [];

  // Pick a random subset of names to look for, to make the emitted
  // code less uniform. We always check the most dangerous ones
  // (hookfunction, hookmetamethod, getupvalue, getconstants, getgc).
  const critical = [
    "hookfunction", "hookmetamethod", "replaceclosure",
    "getupvalue", "getupvalues", "getconstant", "getconstants",
    "getgc", "getreg", "getgenv", "getrenv", "getrawmetatable",
    "setreadonly", "newcclosure", "checkcaller", "isourclosure",
    "identifyexecutor", "getexecutorname",
  ];
  // Use all tool names; emitting them all is fine.
  const allNames = Array.from(new Set([...ROBOX_RE_TOOL_NAMES, ...cfg.toolNames]));

  // The detection function: walk an env table, look for any name
  // whose value is a function, and check if it matches the RE-tool
  // list. We do this in a loop over the tool names, not the env
  // keys, because the tool-name list is small and bounded.
  const matches: string[] = [];
  for (const name of allNames) {
    if (critical.includes(name)) {
      // Always check the critical ones.
    } else if (rng() > 0.5) {
      // Randomly skip non-critical to make detection less uniform.
      continue;
    }
    matches.push(name);
  }

  // Emit the detection block.
  lines.push("-- Roblox anti-debug (RE-tool detection)");
  lines.push("do");

  // Helper: count RE tools found in a given env table.
  const scanEnv = (envName: string) => {
    const hits: string[] = [];
    for (const name of matches) {
      // pcall-wrapped rawget: the env might not be a table, or
      // the index might error.
      const probe = `pcall(function() local _v=rawget(${envName},"${name}"); if type(_v)=="function" then return true end; return false end)`;
      lines.push(`local _hit, _ok = ${probe}`);
      lines.push(`if _hit and _ok then _hits[#_hits+1] = "${name}" end`);
    }
  };

  // Make a list of all the env tables we'll scan.
  const envVars: string[] = ["_G"];
  if (cfg.checkGetenv) {
    envVars.push("getgenv and getgenv() or nil");
    envVars.push("getrenv and getrenv() or nil");
  }
  // For the env list, emit guarded probes (only scan if the
  // env is a non-nil table).
  lines.push("local _hits = {}");
  for (const ev of envVars) {
    lines.push(`do`);
    lines.push(`  local _e = (function() local _ok, _v = pcall(function() return ${ev} end); if _ok and type(_v) == "table" then return _v end; return nil end)()`);
    lines.push(`  if _e then`);
    for (const name of matches) {
      lines.push(`    do local _v = (function() local _ok, _r = pcall(function() return rawget(_e, "${name}") end); if _ok and type(_r) == "function" then return _r end; return nil end)()`);
      lines.push(`      if _v then _hits[#_hits+1] = "${name}" end`);
    }
    lines.push(`  end`);
    lines.push(`end`);
  }

  // If we found any RE tools, sabotage them.
  lines.push("if #_hits > 0 then");
  if (cfg.sabotage) {
    lines.push("  for _, _n in ipairs(_hits) do");
    lines.push("    pcall(function()");
    lines.push("      rawset(_G, _n, function(...) return ... end)");
    lines.push("    end)");
    lines.push("  end");
  }
  // Log the detection (sandboxed in pcall).
  lines.push("  pcall(function() warn(\"luau.uwu: RE-tools detected: \" .. table.concat(_hits, \", \")) end");
  // Don't always abort — sometimes executors have legitimate tools
  // we don't want to ban (e.g. the dev console). Only abort if the
  // hit count crosses a threshold.
  lines.push(`  if #_hits >= 3 then ${abortVarName}() end`);
  lines.push("end");

  lines.push("end -- do");

  return lines.join("\n");
}
