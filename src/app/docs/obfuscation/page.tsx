"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Check, Copy, Shield, Cpu, Layers, Swords } from "lucide-react";
import { MotionDiv, MotionStagger, MotionStaggerItem } from "@/components/motion";

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

const levels = [
  {
    name: "Basic",
    icon: Shield,
    desc: "Lightweight protection for simple scripts. Quick obfuscation with basic string encoding.",
    features: ["Variable renaming", "String literal encoding", "Comment stripping", "Whitespace removal"],
    gradient: "from-emerald-500 to-green-500",
  },
  {
    name: "Normal",
    icon: Layers,
    desc: "Balanced protection with good performance. Includes control flow obfuscation and MBA expressions.",
    features: ["All Basic features", "Control flow obfuscation", "MBA expression injection", "Dead code injection", "Array scrambling"],
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    name: "Full",
    icon: Cpu,
    desc: "Complete VM obfuscation. Transforms bytecode into a custom register-based virtual machine.",
    features: ["All Normal features", "Register VM transformation", "Multi-layer string encoding", "Opcode shuffling", "Control flow flattening", "Anti-debug injection"],
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    name: "Maximum",
    icon: Swords,
    desc: "Maximum protection with anti-tamper and nested VM layers. For high-value scripts.",
    features: ["All Full features", "Nested VM layers", "Anti-tamper hooks", "Runtime integrity checks", "Custom cipher wrapping", "Polymorphic bootstrapper"],
    gradient: "from-rose-500 to-pink-500",
  },
];

export default function ObfuscationPage() {
  return (
    <div className="space-y-8">
      <MotionDiv>
        <Link href="/docs" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to docs
        </Link>
        <h1 className="text-3xl font-bold mb-4">Obfuscation Guide</h1>
        <p className="text-white/40 leading-relaxed">
          Understand the different obfuscation levels and how VM protection works to secure your Luau scripts.
        </p>
      </MotionDiv>

      <MotionDiv delay={0.1}>
        <h2 className="text-xl font-semibold mb-4">Obfuscation Levels</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-6">
          Choose the level of protection that matches your needs. Higher levels provide stronger protection but may increase script size slightly.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {levels.map((level) => (
            <div key={level.name} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 hover:bg-white/[0.05] transition-all">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${level.gradient} mb-3`}>
                <level.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-white/90 mb-1">{level.name}</h3>
              <p className="text-xs text-white/40 mb-3 leading-relaxed">{level.desc}</p>
              <ul className="space-y-1.5">
                {level.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-white/50">
                    <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </MotionDiv>

      <MotionDiv delay={0.2}>
        <h2 className="text-xl font-semibold mb-3">How VM Obfuscation Works</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-3">
          VM obfuscation transforms your original Lua bytecode into a custom instruction set that runs on a virtual machine interpreter. 
          The original bytecode is never exposed — only the VM interpreter and encrypted bytecode exist in the final script.
        </p>
        <div className="rounded-xl bg-[#0a0819] border border-white/[0.08] p-4 mb-4">
          <p className="text-xs text-white/30 mb-2">Simplified flow:</p>
          <pre className="text-xs font-mono text-white/50 leading-relaxed">
            <code>{`Original Script → Bytecode → VM Transformation → Encrypted VM Bytecode
                                 ↓
                    Custom VM Interpreter (in Lua)
                                 ↓
                    Executes original behavior securely`}</code>
          </pre>
        </div>
      </MotionDiv>

      <MotionDiv delay={0.3}>
        <h2 className="text-xl font-semibold mb-3">String Encoding</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-3">
          Our multi-layer string encoding protects string literals from being readable in the obfuscated output. 
          Multiple encoding algorithms are applied in layers:
        </p>
        <ul className="space-y-2 text-sm text-white/50 mb-4">
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /><strong className="text-white/70">S-Box:</strong> Substitution-box transformation with random key generation</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /><strong className="text-white/70">Helix:</strong> Multi-round spiral encoding for deep obfuscation</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /><strong className="text-white/70">Cascade:</strong> Progressive encoding with feedback loops</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /><strong className="text-white/70">Spiral:</strong> Nested encoding for maximum protection</li>
        </ul>
      </MotionDiv>

      <MotionDiv delay={0.4}>
        <h2 className="text-xl font-semibold mb-3">Control Flow Protection</h2>
        <p className="text-white/50 text-sm leading-relaxed mb-3">
          Control flow flattening transforms your script&apos;s loops and conditionals into a flat state machine. 
          This makes it extremely difficult for reverse engineers to understand the program flow.
        </p>
        <p className="text-white/50 text-sm leading-relaxed">
          Combined with opaque predicates (MBA expressions that always evaluate to a known value but are hard to analyze statically), 
          this creates a formidable barrier against both static and dynamic analysis.
        </p>
      </MotionDiv>

      <MotionDiv delay={0.5}>
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <Link href="/docs/getting-started" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Getting Started
          </Link>
          <Link href="/docs/api" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors group">
            API Reference
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </MotionDiv>
    </div>
  );
}
