"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Check, Copy, Globe, Key, Shield, FileCode } from "lucide-react";

function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      {title && <div className="text-xs text-white/30 mb-1 font-mono">{title}</div>}
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

export default function ApiPage() {
  return (
    <div className="space-y-8">
      <Link href="/docs" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to docs
      </Link>

      <div>
        <h1 className="text-3xl font-bold mb-4">API Reference</h1>
        <p className="text-white/40 leading-relaxed">
          The LuaCrypt API allows you to validate keys, deliver scripts, and manage your account programmatically.
        </p>
      </div>

      {/* Base URL */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
        <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Base URL</div>
        <code className="text-sm font-mono text-emerald-400">https://luacrypt.dev/api</code>
      </div>

      {/* Validate Key */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-semibold">Validate Key</h2>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-mono px-2 py-0.5">POST</span>
          <code className="text-sm font-mono text-white/60">/validate</code>
        </div>
        <p className="text-sm text-white/50 leading-relaxed">Validates a license key and optionally binds it to a HWID.</p>

        <div>
          <p className="text-xs text-white/30 mb-2">Request body:</p>
          <CodeBlock code={`{
  "key": "XXXX-XXXX-XXXX-XXXX",    // required - the license key
  "hwid": "USER_HARDWARE_ID",       // optional - hardware ID for binding
  "project": "project-slug"         // optional - project identifier
}`} />
        </div>

        <div>
          <p className="text-xs text-white/30 mb-2">Response (200):</p>
          <CodeBlock code={`{
  "valid": true,
  "user": "username",
  "plan": "pro",
  "expires_at": "2025-12-31T23:59:59Z",
  "hwid_locked": true
}`} />
        </div>

        <div>
          <p className="text-xs text-white/30 mb-2">Response (403):</p>
          <CodeBlock code={`{
  "valid": false,
  "reason": "Key expired / HWID mismatch / Key not found"
}`} />
        </div>
      </div>

      {/* Load Script */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-semibold">Load Script</h2>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-md bg-blue-500/15 text-blue-400 text-xs font-mono px-2 py-0.5">GET</span>
          <code className="text-sm font-mono text-white/60">/scripts/:id/load</code>
        </div>
        <p className="text-sm text-white/50 leading-relaxed">Fetches the obfuscated script content for execution.</p>

        <div>
          <p className="text-xs text-white/30 mb-2">Query parameters:</p>
          <CodeBlock code={`// Optional: key for key-gated scripts
GET https://luacrypt.dev/api/scripts/abc123/load?key=XXXX-XXXX-XXXX-XXXX`} />
        </div>

        <div>
          <p className="text-xs text-white/30 mb-2">Example (Roblox):</p>
           <CodeBlock code={`local scriptUrl = "https://luacrypt.dev/api/scripts/abc123/load"
local scriptContent = game:HttpGet(scriptUrl)
loadstring(scriptContent)()`} />
        </div>
      </div>

      {/* Generate Keys API */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-semibold">Generate Keys (Authenticated)</h2>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-mono px-2 py-0.5">POST</span>
          <code className="text-sm font-mono text-white-60">/keys</code>
        </div>
        <p className="text-sm text-white/50 leading-relaxed">
          Requires authentication with your API key (found in your dashboard settings).
        </p>

        <div>
          <p className="text-xs text-white/30 mb-2">Request headers:</p>
          <CodeBlock code={`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`} />
        </div>

        <div>
          <p className="text-xs text-white/30 mb-2">Request body:</p>
          <CodeBlock code={`{
  "project_id": "project-uuid",
  "count": 10,
  "prefix": "MYKEY",
  "expires_in_days": 30,
  "hwid_locked": true
}`} />
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-amber-400" />
          <h3 className="font-semibold text-sm">Rate Limiting</h3>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          API requests are rate-limited based on your plan:
          Free: 60 req/min | Pro: 300 req/min | Premium: 1000 req/min.
          Rate limit headers are included in every response.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <Link href="/docs/obfuscation" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Obfuscation Guide
        </Link>
        <Link href="/docs/discord-bot" className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors group">
          Discord Bot
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
