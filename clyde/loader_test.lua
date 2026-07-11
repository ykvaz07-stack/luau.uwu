local key = "YOUR_KEY_HERE"
local hwid = game:GetService("RbxAnalyticsService"):GetClientId()
local url = "https://luau-uwu.vercel.app/api/scripts/c8f3b907-8e20-4b4c-a2ae-ba1c6c367549/load?key=" .. key .. "&hwid=" .. hwid
local code = game:HttpGet(url)
loadstring(code)()