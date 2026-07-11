"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Check, Copy, Bot, MessageCircle, Shield, Key, Users, Settings, LogIn } from "lucide-react";

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

const commands = [
  {
    category: "User Commands",
    icon: Users,
    color: "from-cyan-500 to-teal-500",
    items: [
      { cmd: "/redeem <key>", desc: "Redeem a license key and link your Discord account." },
      { cmd: "/resethwid", desc: "Reset your HWID to bind your key to a new machine." },
      { cmd: "/myscripts", desc: "View your accessible scripts and get loadstring URLs." },
      { cmd: "/status", desc: "Check your key status, expiry, and linked HWID." },
    ],
  },
  {
    category: "Admin Commands",
    icon: Shield,
    color: "from-indigo-500 to-purple-500",
    items: [
      { cmd: "/whitelist <user>", desc: "Manually whitelist a user for a specific project." },
      { cmd: "/unwhitelist <user>", desc: "Remove a user's whitelist access." },
      { cmd: "/blacklist <user>", desc: "Permanently blacklist a user from your projects." },
      { cmd: "/mass-whitelist <role>", desc: "Whitelist all members with a specific Discord role." },
    ],
  },
  {
    category: "Management",
    icon: Settings,
    color: "from-amber-500 to-orange-500",
    items: [
      { cmd: "/force-resethwid <user>", desc: "Override cooldown to reset a user's HWID." },
      { cmd: "/compensate <days>", desc: "Add days to all keys in a project (for downtime)." },
      { cmd: "/givekey <user>", desc: "Grant a free key to a user for your project." },
      { cmd: "/revokekey <user>", desc: "Revoke a specific user's key." },
    ],
  },
  {
    category: "Setup",
    icon: LogIn,
    color: "from-green-500 to-emerald-500",
    items: [
      { cmd: "/login <api_key>", desc: "Authenticate the bot with your luau.uwu API key." },
      { cmd: "/setpanel <channel>", desc: "Set up the user control panel in a channel." },
      { cmd: "/setlogs <channel>", desc: "Configure the logging channel for bot actions." },
      { cmd: "/logout", desc: "Disconnect the bot from your account." },
    ],
  },
];

export default function DiscordBotPage() {
  return (
    <div className="space-y-8">
      <Link href="/docs" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to docs
      </Link>

      <div>
        <h1 className="text-3xl font-bold mb-4">Discord Bot</h1>
        <p className="text-white/40 leading-relaxed">
          The luau.uwu Discord bot allows you to manage keys, whitelist users, and control access — all from your Discord server.
        </p>
      </div>

      {/* Setup */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-400" />
          <h2 className="text-xl font-semibold">Setup</h2>
        </div>
        <p className="text-sm text-white/50 leading-relaxed">
          Setting up the Discord bot takes less than a minute:
        </p>
        <ul className="space-y-2 text-sm text-white/50">
          <li className="flex items-start gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold shrink-0 mt-0.5">1</span>Click the invite link from your dashboard to add the bot to your server</li>
          <li className="flex items-start gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold shrink-0 mt-0.5">2</span>Run <code className="text-xs font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-indigo-400">/login</code> with your API key (found in Dashboard → Settings)</li>
          <li className="flex items-start gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold shrink-0 mt-0.5">3</span>Run <code className="text-xs font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-indigo-400">/setpanel</code> to create the user control panel in a channel</li>
          <li className="flex items-start gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold shrink-0 mt-0.5">4</span>Run <code className="text-xs font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-indigo-400">/setlogs</code> to configure the logging channel</li>
        </ul>
      </div>

      {/* Commands */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Commands</h2>
        {commands.map((group) => (
          <div key={group.category}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${group.color}`}>
                <group.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="font-semibold text-sm text-white/80">{group.category}</h3>
            </div>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <div key={item.cmd} className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                  <code className="text-xs font-mono text-indigo-400 shrink-0 min-w-[140px]">{item.cmd}</code>
                  <p className="text-xs text-white/50">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Panel */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">User Control Panel</h2>
        <p className="text-sm text-white/50 leading-relaxed">
          The control panel provides an interactive interface for your users. They can click buttons to:
        </p>
        <ul className="grid grid-cols-2 gap-2 text-sm text-white/50">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" /> Redeem keys
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" /> Reset HWID
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" /> Get their script
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" /> Check key status
          </li>
        </ul>
      </div>

      {/* Permissions */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-amber-400" />
          <h3 className="font-semibold text-sm">Required Permissions</h3>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          The bot needs the following permissions: Send Messages, Embed Links, Read Message History, 
          Manage Roles (for auto-role assignment), and Use Slash Commands. Admin commands are 
          restricted to users with the &quot;Manager&quot; role in your server.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <Link href="/docs/api" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> API Reference
        </Link>
      </div>
    </div>
  );
}
