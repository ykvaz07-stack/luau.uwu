import { NextResponse } from "next/server";
import {
  lex,
  parse,
  obfuscate,
  encodeStrings,
  scrambleControlFlow,
  printChunk,
} from "../../../../../../clyde/dist/index.js";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const keyParam = searchParams.get("key");

  const requestUrl = new URL(request.url);
  const domain = process.env.NEXT_PUBLIC_SITE_URL || `${requestUrl.protocol}//${requestUrl.host}`;

  const lua = String.raw`
--[[
  luau.uwu — protected
  /\_/\
 ( ^.^ )
  > ^ <
]]

${keyParam ? `script_key = "${keyParam}"` : ""}

local function getHwid()
  -- Method 1: gethwid() — many executors provide this directly
  local ok, result = pcall(gethwid)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end

  -- Method 2: syn.crypt.generate / crypt.generate / syn_crypt_generate
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

  -- Method 3: syn.crypt.custom.hash — used by some Synapse-based executors
  ok, result = pcall(function()
    if syn and syn.crypt and syn.crypt.custom and syn.crypt.custom.hash then
      return syn.crypt.custom.hash("hwid")
    end
  end)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end

  -- Method 4: Executor HTTP request to echo-headers (syn.request / http_request / request)
  -- This is the ONLY way to capture fingerprint headers since executors
  -- inject them into their own HTTP stack, NOT into game:HttpGet
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

  -- Method 5: game:HttpGet echo-headers (fallback — works on some executors that patch Roblox's HTTP)
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

  -- Method 6: RbxAnalyticsService:GetClientId() — last resort, not a true HWID
  ok, result = pcall(function()
    return game:GetService("RbxAnalyticsService"):GetClientId()
  end)
  if ok and type(result) == "string" and #result > 0 then
    return result
  end

  return ""
end

local function kick(msg)
  local ok, plr = pcall(function() return game:GetService("Players").LocalPlayer end)
  if ok and plr then
    plr:Kick(tostring(msg))
  else
    error(tostring(msg), 0)
  end
end

local key = script_key or getgenv().script_key
if type(key) ~= "string" or #key < 5 then
  kick("[luau.uwu] No valid key found. Set script_key = 'YOUR_KEY' at the top of your script.")
  return
end

local hwid = getHwid()
local loadUrl = "${domain}/api/scripts/${id}/load?key=" .. key
if hwid and #hwid > 0 then
  loadUrl = loadUrl .. "&hwid=" .. hwid
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

  // Apply obfuscation
  const { tokens } = lex(lua);
  let ast = parse(tokens);
  ast = encodeStrings(ast, { enabled: true });
  ast = scrambleControlFlow(ast, { enabled: true });
  const obfuscated = obfuscate(ast, { renameLocals: true, preserveGlobals: false });
  const finalLua = printChunk(obfuscated);

  return new NextResponse(finalLua, {
    headers: {
      "Content-Type": "application/octet-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
