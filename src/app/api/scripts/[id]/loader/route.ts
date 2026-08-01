import { NextResponse } from "next/server";
import {
  lex,
  parse,
  runPipeline,
  printChunk,
} from "../../../../../../clyde/dist/index.js";

export const runtime = "edge";

/**
 * Escape a value so it is safe to embed inside a Lua double-quoted string
 * literal. The input must be a string with no control characters other than
 * those we explicitly escape. Anything else (including backticks, $, etc.) is
 * left alone because Lua doesn't interpolate them.
 *
 * Returns "" for non-strings, null, undefined, or any value that isn't
 * a string of reasonable length. This is defense-in-depth: even if the
 * caller forgets to validate, we won't emit a malformed Lua chunk.
 */
function luaEscape(v: unknown): string {
  if (typeof v !== "string") return "";
  if (v.length > 4096) return "";
  let out = "";
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c === 0x5c) out += "\\\\";          // backslash
    else if (c === 0x22) out += "\\\"";     // double quote
    else if (c === 0x0a) out += "\\n";      // newline
    else if (c === 0x0d) out += "\\r";      // carriage return
    else if (c === 0x09) out += "\\t";      // tab
    else if (c === 0x00) out += "\\0";      // null byte
    else if (c < 0x20 || c === 0x7f) {
      // Other control chars: emit as \xHH.
      out += "\\x" + c.toString(16).padStart(2, "0");
    } else {
      out += v[i];
    }
  }
  return out;
}

/**
 * Percent-encode a string for safe inclusion in a URL query string. This is
 * stricter than the bare minimum (encodeURIComponent in JS) — we explicitly
 * encode everything outside the unreserved set [A-Za-z0-9-_.~] to avoid any
 * ambiguity with how Lua's HttpGet parses query strings.
 */
function urlEncode(v: unknown): string {
  if (typeof v !== "string") return "";
  if (v.length > 2048) return "";
  let out = "";
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (
      (c >= 0x41 && c <= 0x5a) ||   // A-Z
      (c >= 0x61 && c <= 0x7a) ||   // a-z
      (c >= 0x30 && c <= 0x39) ||   // 0-9
      c === 0x2d || c === 0x5f ||   // - _
      c === 0x2e || c === 0x7e      // . ~
    ) {
      out += v[i];
    } else {
      out += "%" + c.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return out;
}

/**
 * Validate a script id. Must be a hex/UUID-like token with a bounded length;
 * we reject anything containing path separators, control characters, or
 * characters that could escape the URL.
 */
function validateId(id: unknown): string {
  if (typeof id !== "string") return "";
  if (id.length === 0 || id.length > 64) return "";
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return "";
  return id;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = validateId(rawId);
  if (!id) {
    return new NextResponse("-- invalid script id", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { searchParams } = new URL(request.url);
  const rawKey = searchParams.get("key");

  const requestUrl = new URL(request.url);
  // domain is from our own env (or the request's own host) — still escape to
  // be safe against misconfiguration (someone setting NEXT_PUBLIC_SITE_URL
  // to a value containing " or \).
  const domain = luaEscape(
    process.env.NEXT_PUBLIC_SITE_URL || `${requestUrl.protocol}//${requestUrl.host}`
  );

  // Lua-escape the key (defense against Lua-injection in the string literal).
  const safeKey = luaEscape(rawKey);
  // URL-encode the key for the loadUrl query parameter.
  const urlSafeKey = urlEncode(rawKey);

  const lua = String.raw`
--[[
  luau.uwu — protected loader
  /\_/\
 ( ^.^ )
  > ^ <
]]

${safeKey ? `local script_key = "${safeKey}"` : ""}

local function getHwid()
  local ok, result = pcall(gethwid)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end

  ok, result = pcall(function()
    if syn and syn.crypt and syn.crypt.generate then
      return syn.crypt.generate("hwid")
    elseif crypt and crypt.generate then
      return crypt.generate("hwid")
    elseif syn_crypt_generate then
      return syn_crypt_generate("hwid")
    end
  end)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end

  ok, result = pcall(function()
    if syn and syn.crypt and syn.crypt.custom and syn.crypt.custom.hash then
      return syn.crypt.custom.hash("hwid")
    end
  end)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end

  ok, result = pcall(function()
    local req = (syn and syn.request) or http_request or request or (http and http.request)
    if not req then return nil end
    local resp = req({
      Url = "${domain}/api/echo-headers",
      Method = "GET",
    })
    if resp and resp.Body then
      local decoded = game:GetService("HttpService"):JSONDecode(resp.Body)
      if decoded and decoded.headers then
        for h, v in pairs(decoded.headers) do
          if string.match(string.lower(h), ".-fingerprint$") or
             h == "Krnl-HWID" or
             h == "Proto-User-Identifier" or
             h == "Exploit-Guid" then
            return v
          end
        end
      end
    end
  end)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end

  ok, result = pcall(function()
    local echoRes = game:HttpGet("${domain}/api/echo-headers")
    local decoded = game:GetService("HttpService"):JSONDecode(echoRes)
    if decoded and decoded.headers then
      for h, v in pairs(decoded.headers) do
        if string.match(string.lower(h), ".-fingerprint$") or
           h == "Krnl-HWID" or
           h == "Proto-User-Identifier" then
          return v
        end
      end
    end
  end)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end

  ok, result = pcall(function()
    return game:GetService("RbxAnalyticsService"):GetClientId()
  end)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end

  return ""
end

local function url_encode(s)
  if type(s) ~= "string" then return "" end
  local out = {}
  for i = 1, #s do
    local c = string.byte(s, i)
    if (c >= 65 and c <= 90) or (c >= 97 and c <= 122) or (c >= 48 and c <= 57)
       or c == 45 or c == 95 or c == 46 or c == 126 then
      out[#out+1] = string.char(c)
    else
      out[#out+1] = "%" .. string.format("%02X", c)
    end
  end
  return table.concat(out)
end

local function kick(msg)
  local ok, plr = pcall(function() return game:GetService("Players").LocalPlayer end)
  if ok and plr then
    plr:Kick(tostring(msg))
  else
    error(tostring(msg), 0)
  end
end

local key = script_key
if key == nil or #key == 0 then
  local ok_genv, genv = pcall(getgenv)
  if ok_genv and type(genv) == "table" then
    key = genv.script_key or ""
  else
    key = ""
  end
end

local hwid = getHwid()
local loadUrl = "${domain}/api/scripts/${id}/load"
local params = {}
if key and #key > 0 then
  params[#params+1] = "key=" .. url_encode(key)
end
if hwid and #hwid > 0 then
  params[#params+1] = "hwid=" .. url_encode(hwid)
end
if #params > 0 then
  loadUrl = loadUrl .. "?" .. table.concat(params, "&")
end

local ok, result = pcall(function()
  return game:HttpGet(loadUrl)
end)

if not ok then
  kick("[luau.uwu] Failed to contact server: " .. tostring(result))
  return
end

if result:find("luau.uwu:") then
  local msg = result:match("%-%- (.+)")
  kick(msg or "Access Denied")
  return
end

local fn, compileErr = loadstring(result)
if not fn then
  kick("[luau.uwu] Script error: " .. tostring(compileErr))
  return
end
local success, runtimeErr = pcall(fn)
if not success then
  kick("[luau.uwu] Runtime error: " .. tostring(runtimeErr))
end
`;

  // Obfuscation pipeline (NO VM - loads must run in executor native environment)
  const { tokens } = lex(lua);
  let ast = parse(tokens);

  // Use medium-level pipeline: rename, string encode, number obfuscation,
  // control flow scramble, table scramble, dead code, anti-debug
  ast = runPipeline(ast, {
    protectionLevel: "medium",
    seed: Date.now() ^ Math.floor(Math.random() * 0x7fffffff),
  });

  // Print back to Lua - returns plain obfuscated code, NOT VM-wrapped
  const finalLua = printChunk(ast);

  return new NextResponse(finalLua, {
    headers: {
      "Content-Type": "application/octet-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
