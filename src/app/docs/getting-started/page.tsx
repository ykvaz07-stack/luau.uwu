"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, Copy } from "lucide-react";
import { useState } from "react";
import { MotionDiv } from "@/components/motion";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.1] transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="rounded-xl bg-[#0a0819] border border-white/[0.08] p-4 overflow-x-auto">
        <code className="text-sm font-mono text-white/70 leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

export default function GettingStartedPage() {
  return (
    <div className="space-y-8">
      <MotionDiv>
        <Link href="/docs" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to docs
        </Link>
        <h1 className="text-3xl font-bold mb-4">Getting Started</h1>
        <p className="text-white/40 leading-relaxed">
          Learn how to sign up, create your first project, upload a script, generate license keys, and integrate the validation API.
        </p>
      </MotionDiv>

      <MotionDiv delay={0.1}>
        <h2 className="text-xl font-semibold mb-3">1. Create an Account</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-3">
          Head to the <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">signup page</Link> and create your account. You can start with the Free plan and upgrade later.
        </p>
        <ul className="space-y-2 text-sm text-white/50">
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Choose a plan (Free, Pro, or Premium)</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Verify your email address</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Log in to your dashboard</li>
        </ul>
      </MotionDiv>

      <MotionDiv delay={0.2}>
        <h2 className="text-xl font-semibold mb-3">2. Create a Project</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-3">
          Projects are containers for your scripts. Each project can have multiple scripts with their own settings.
        </p>
        <ul className="space-y-2 text-sm text-white/50">
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Go to the Projects page in your dashboard</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Click &quot;Create Project&quot; and give it a name</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Optionally configure obfuscation defaults</li>
        </ul>
      </MotionDiv>

      <MotionDiv delay={0.3}>
        <h2 className="text-xl font-semibold mb-3">3. Upload a Script</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-3">
          Upload your Luau script to the project. You can choose the obfuscation level and other settings.
        </p>
        <ul className="space-y-2 text-sm text-white/50">
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Go to the Scripts page</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Click &quot;Upload Script&quot; and select your .luau file</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Choose obfuscation level (Basic, Normal, Full, or Maximum)</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Click &quot;Upload&quot; — your script is now hosted and ready</li>
        </ul>
      </MotionDiv>

      <MotionDiv delay={0.4}>
        <h2 className="text-xl font-semibold mb-3">4. Generate License Keys</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-3">
          Generate keys that users can use to validate access to your script. Keys can be HWID-locked and have expiration dates.
        </p>
        <ul className="space-y-2 text-sm text-white/50">
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Go to the Keys page</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Click &quot;Generate Keys&quot; and configure settings</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Choose quantity, optional prefix, and expiry</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> Distribute the keys to your users</li>
        </ul>
      </MotionDiv>

      <MotionDiv delay={0.5}>
        <h2 className="text-xl font-semibold mb-3">5. Integrate Validation</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-3">
          Add key validation to your script. Users must have a valid key to execute your protected script.
        </p>
        <p className="text-xs text-white/30 mb-2">Example validation code:</p>
        <CodeBlock code={`local HttpService = game:GetService("HttpService")

local function validateKey(key, hwid)
    local response = HttpService:RequestAsync({
        Url = "https://luau.uwu/api/validate",
        Method = "POST",
        Headers = { ["Content-Type"] = "application/json" },
        Body = HttpService:JSONEncode({
            key = key,
            hwid = hwid
        })
    })
    
    local result = HttpService:JSONDecode(response.Body)
    return result
end

-- Usage
local key = "USER_KEY_HERE"
local hwid = "USER_HWID_HERE"  -- or game:GetService("RbxAnalyticsService"):GetClientId()

local result = validateKey(key, hwid)
if result.valid then
    print("Access granted! Welcome, " .. result.user)
    loadstring(game:HttpGet("YOUR_SCRIPT_URL"))()
else
    warn("Invalid key: " .. result.reason)
end`} />
      </MotionDiv>

      <MotionDiv delay={0.6}>
        <h2 className="text-xl font-semibold mb-3">6. Deliver Your Script</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-4">
          Once validated, users can load your script using the loadstring-ready URL from your dashboard. The script is served obfuscated and ready to execute.
        </p>
        <p className="text-xs text-white/30 mb-2">Loading a protected script:</p>
        <CodeBlock code={`-- After successful validation
local scriptUrl = "https://luau.uwu/api/scripts/abc123/load"
local success, result = pcall(function()
    return game:HttpGet(scriptUrl)
end)

if success then
    loadstring(result)()
else
    warn("Failed to load script: " .. result)
end`} />
      </MotionDiv>

      <MotionDiv delay={0.7}>
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <div />
          <Link href="/docs/obfuscation" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors group">
            Obfuscation Guide
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </MotionDiv>
    </div>
  );
}
