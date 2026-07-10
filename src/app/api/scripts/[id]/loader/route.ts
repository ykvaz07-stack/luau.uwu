import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const domain = process.env.NEXT_PUBLIC_SITE_URL || "https://luau.uwu";

  const lua = String.raw`
--[[
  luau.uwu — protected
  /\_/\
 ( ^.^ )
  > ^ <
]]

local function getHwid()
  local ok, result = pcall(function()
    -- Method 1: Request to echo-headers to extract fingerprint headers
    local echoRes = game:HttpGet("${domain}/api/echo-headers")
    local decoded = game:GetService("HttpService"):JSONDecode(echoRes)
    local fingerprintHeaders = {
      "syn-fingerprint", "sw-fingerprint", "krnl-hwid",
      "sentinel-fingerprint", "proto-user-identifier",
      "exploit-guid", "electron-fingerprint", "fingerprint",
      "x-fingerprint",
    }
    for _, headerName in ipairs(fingerprintHeaders) do
      for h, v in pairs(decoded.headers) do
        if string.lower(h) == headerName or string.match(string.lower(h), "-fingerprint") then
          return v
        end
      end
    end
    -- Method 2: syn.crypt.generate
    if syn and syn.crypt and syn.crypt.generate then
      return syn.crypt.generate("hwid")
    end
    if crypt and crypt.generate then
      return crypt.generate("hwid")
    end
    if syn_crypt_generate then
      return syn_crypt_generate("hwid")
    end
    -- Method 3: RbxAnalyticsService
    local ok2, clientId = pcall(function()
      return game:GetService("RbxAnalyticsService"):GetClientId()
    end)
    if ok2 then return clientId end
  end)
  return ok and tostring(result) or ""
end

local key = script_key or getgenv().script_key
if type(key) ~= "string" or #key < 5 then
  return error("[luau.uwu] No valid key found. Set script_key = 'YOUR_KEY' at the top of your script.", 0)
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
  return error("[luau.uwu] Failed to contact server: " .. tostring(result), 0)
end

if result:find("ScriptShield:") then
  return error(result, 0)
end

local fn, compileErr = loadstring(result)
if not fn then
  return error("[luau.uwu] Script error: " .. tostring(compileErr), 0)
end
local success, runtimeErr = pcall(fn)
if not success then
  return error("[luau.uwu] Runtime error: " .. tostring(runtimeErr), 0)
end
`;

  return new NextResponse(lua, {
    headers: {
      "Content-Type": "application/octet-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
