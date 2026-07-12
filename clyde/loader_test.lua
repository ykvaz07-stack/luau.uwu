-- luau.uwu — Loader Usage Example
-- Replace YOUR_KEY with an actual key from your dashboard
-- Replace SCRIPT_ID with your script's UUID

script_key = "YOUR_KEY_HERE"
loadstring(game:HttpGet("https://luau-uwu.vercel.app/api/scripts/YOUR_SCRIPT_ID/loader?key=" .. script_key))()
