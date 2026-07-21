"use client";

import Link from "next/link";
import {
  ArrowRight,
  Key,
  Shield,
  Code,
  Zap,
  Lock,
  BarChart3,
  Bot,
  Globe,
  Cloud,
  Server,
  Cpu,
  FileCode,
  Check,
  Sparkles,
  Layers,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { MotionDiv, MotionStagger, MotionStaggerItem } from "@/components/motion";

const featureCategories = [
  {
    title: "Key Management",
    description: "Full-featured license key system with HWID locking, expiry management, and Discord integration.",
    icon: Key,
    gradient: "from-emerald-500 to-teal-500",
    features: [
      { title: "Key Generation", desc: "Generate single or bulk keys with customizable prefixes and patterns." },
      { title: "HWID Locking", desc: "Bind keys to hardware IDs to prevent sharing across machines." },
      { title: "Expiry Management", desc: "Set expiration dates, auto-renew, or permanent keys." },
      { title: "Discord Integration", desc: "Users can link their Discord account for key management." },
      { title: "Revocation", desc: "Instantly revoke or ban keys at any time from the dashboard." },
      { title: "Analytics", desc: "Track key usage, activations, and geographic distribution." },
    ],
  },
  {
    title: "VM Obfuscation",
    description: "Enterprise-grade VM obfuscation that turns your bytecode into a custom register-based virtual machine.",
    icon: Shield,
    gradient: "from-emerald-500 to-lime-500",
    features: [
      { title: "Register VM", desc: "Custom register-based virtual machine that interprets obfuscated bytecode." },
      { title: "String Encryption", desc: "Multi-layer string encoding with S-Box, helix, and cascade algorithms." },
      { title: "Control Flow Flattening", desc: "Flattens control flow to make static analysis extremely difficult." },
      { title: "MBA Expressions", desc: "Mixed Boolean-Arithmetic opaque predicates to confuse decompilers." },
      { title: "Dead Code Injection", desc: "Injects junk code paths that never execute to waste reverse engineers." },
      { title: "Anti-Tamper", desc: "Detects modification attempts and crashes the script if tampered with." },
    ],
  },
  {
    title: "Script Hosting",
    description: "Secure script hosting with versioning, obfuscation on demand, and loadstring-ready URLs.",
    icon: Cloud,
    gradient: "from-emerald-500 to-cyan-500",
    features: [
      { title: "Version Control", desc: "Upload new versions while keeping old ones accessible." },
      { title: "On-Demand Obfuscation", desc: "Obfuscate scripts instantly from the dashboard or API." },
      { title: "Loadstring URLs", desc: "Get ready-to-use URLs for game:HttpGet and loadstring." },
      { title: "Access Logs", desc: "See who loaded your script and when." },
      { title: "Project Organization", desc: "Organize scripts into projects with custom settings per script." },
      { title: "Team Access", desc: "Share project access with your team members." },
    ],
  },
  {
    title: "API & Integrations",
    description: "REST API for key validation, script delivery, and Discord bot integration.",
    icon: Globe,
    gradient: "from-lime-500 to-green-500",
    features: [
      { title: "Validation API", desc: "REST endpoint for server-side key validation with sub-50ms response." },
      { title: "Discord Bot", desc: "Full Discord bot for whitelisting, HWID reset, and key management." },
      { title: "Webhooks", desc: "Receive real-time notifications for key usage and script loads." },
      { title: "Script Delivery", desc: "Securely serve obfuscated scripts via API for loadstring." },
      { title: "Rate Limiting", desc: "Built-in rate limiting and abuse protection." },
      { title: "SDK Available", desc: "Drop-in Lua module for easy integration in your scripts." },
    ],
  },
];

const comparisonFeatures = [
  { feature: "VM Obfuscation", free: "Basic", pro: "Full", premium: "Full + Anti-Tamper" },
  { feature: "Projects", free: "1", pro: "5", premium: "Unlimited" },
  { feature: "Scripts", free: "2", pro: "15", premium: "Unlimited" },
  { feature: "License Keys", free: "25", pro: "1,000", premium: "10,000" },
  { feature: "HWID Locking", free: false, pro: true, premium: true },
  { feature: "API Access", free: false, pro: true, premium: true },
  { feature: "Discord Bot", free: false, pro: true, premium: true },
  { feature: "Priority Support", free: false, pro: true, premium: true },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-lime-500/6 blur-[120px]" />
      </div>

      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <MotionDiv delay={0.1}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Features
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-lime-400 bg-clip-text text-transparent">
                protect
              </span>{" "}
              your scripts
            </h1>
            <p className="text-white/40 max-w-2xl mx-auto text-lg">
              From obfuscation to key management, we provide a complete toolkit for Roblox script developers.
            </p>
          </MotionDiv>
        </div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((category, idx) => (
        <section key={category.title} className={`py-16 md:py-24 ${idx > 0 ? "border-t border-white/[0.04]" : ""}`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <MotionDiv delay={0.1}>
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${category.gradient} mb-6`}>
                  <category.icon className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-3">{category.title}</h2>
                <p className="text-white/40 mb-8 text-base leading-relaxed">{category.description}</p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors group"
                >
                  View pricing
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </MotionDiv>

              <MotionDiv delay={0.2}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {category.features.map((feature) => (
                    <div key={feature.title} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200">
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 shrink-0 mt-0.5">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-white/80 mb-1">{feature.title}</h3>
                          <p className="text-xs text-white/40 leading-relaxed">{feature.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </MotionDiv>
            </div>
          </div>
        </section>
      ))}

      {/* Comparison Table */}
      <section className="py-16 md:py-24 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Plan comparison</h2>
            <p className="text-white/40">See what each plan includes.</p>
          </MotionDiv>

          <MotionDiv delay={0.1}>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-4 px-6 text-sm font-medium text-white/40">Feature</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-white/50">Free</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-emerald-400 bg-emerald-500/[0.04]">Pro</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-white/50">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((item, i) => (
                    <tr key={item.feature} className={`border-b border-white/[0.04] last:border-0 ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                      <td className="py-3.5 px-6 text-sm text-white/70">{item.feature}</td>
                      {(["free", "pro", "premium"] as const).map((tier) => {
                        const val = item[tier];
                        return (
                            <td key={tier} className={`text-center py-3.5 px-4 text-sm ${tier === "pro" ? "bg-emerald-500/[0.04]" : ""}`}>
                            {typeof val === "boolean" ? (
                              val ? (
                                <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                              ) : (
                                <span className="text-white/20">—</span>
                              )
                            ) : (
                              <span className="text-white/70">{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MotionDiv>

          <MotionDiv className="text-center mt-8">
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-6 text-sm font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Compare plans in detail
            </Link>
          </MotionDiv>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
