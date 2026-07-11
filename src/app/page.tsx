"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Cat,
  Key,
  Code,
  Zap,
  Lock,
  BarChart3,
  ArrowRight,
  Check,
  Shield,
  X,
  ChevronDown,
  HelpCircle,
  Monitor,
  Server,
  Sparkles,
  Star,
  Layers,
  FileCode,
  Play,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { MotionDiv, MotionStagger, MotionStaggerItem } from "@/components/motion";
import { TerminalDemo } from "@/components/demo/terminal-demo";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

const features = [
  {
    icon: Key,
    title: "Key System",
    description: "Generate, manage, and validate license keys with HWID locking, expiry dates, and Discord integration.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Shield,
    title: "VM Obfuscation",
    description: "Register-based VM protection with string encryption, MBA expressions, and control flow flattening.",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: Code,
    title: "Script Hosting",
    description: "Upload and version your scripts with loadstring-ready URLs. Obfuscate on demand from the dashboard.",
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Sub-50ms key validation with 99.9% uptime. Your users get instant access without delays.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Lock,
    title: "HWID Locking",
    description: "Bind keys to hardware IDs to prevent sharing. One key, one machine. Revoke and reset anytime.",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track executions, active users, key usage, and script load counts with real-time dashboards.",
    gradient: "from-emerald-500 to-green-500",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime", icon: Server },
  { value: "<50ms", label: "Avg. Validation", icon: Zap },
  { value: "50K+", label: "Keys Generated", icon: Key },
  { value: "10K+", label: "Scripts Protected", icon: Shield },
];

const pricingPlans = [
  {
    name: "Free",
    price: { monthly: "$0", yearly: "$0" },
    period: { monthly: "/month", yearly: "/year" },
    description: "Perfect for trying out luau.uwu",
    features: [
      { text: "1 project", included: true },
      { text: "2 scripts", included: true },
      { text: "25 keys", included: true },
      { text: "Basic obfuscation", included: true },
      { text: "HWID locking", included: false },
      { text: "API access", included: false },
      { text: "Discord bot", included: false },
      { text: "Priority support", included: false },
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: { monthly: "$15", yearly: "$10" },
    period: { monthly: "/month", yearly: "/month" },
    description: "For developers with growing scripts",
    features: [
      { text: "5 projects", included: true },
      { text: "15 scripts", included: true },
      { text: "1,000 keys", included: true },
      { text: "Full VM obfuscation", included: true },
      { text: "HWID locking", included: true },
      { text: "API access", included: true },
      { text: "Discord bot", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Premium",
    price: { monthly: "$30", yearly: "$20" },
    period: { monthly: "/month", yearly: "/month" },
    description: "For professional script developers",
    features: [
      { text: "Unlimited projects", included: true },
      { text: "Unlimited scripts", included: true },
      { text: "10,000 keys", included: true },
      { text: "Full + anti-tamper", included: true },
      { text: "HWID locking", included: true },
      { text: "API + webhooks", included: true },
      { text: "Discord bot", included: true },
      { text: "Custom branding", included: true },
    ],
    cta: "Go Premium",
    popular: false,
  },
];

const faqs = [
  {
    q: "What is luau.uwu?",
    a: "luau.uwu is a professional key management, VM obfuscation, and script protection platform built specifically for Roblox developers. We help you secure your Luau scripts and control access with license keys.",
  },
  {
    q: "How does the obfuscation work?",
    a: "Our VM obfuscation transforms your Luau bytecode into a register-based virtual machine that runs inside a custom VM interpreter. This makes reverse engineering extremely difficult while keeping performance overhead minimal.",
  },
  {
    q: "Can I try it before buying?",
    a: "Absolutely! We offer a 7-day free trial on the Pro plan with no credit card required. You get access to all Pro features including full VM obfuscation, HWID locking, and API access.",
  },
  {
    q: "How do license keys work?",
    a: "Generate keys from your dashboard, assign them to users, and validate them server-side through our API. Keys support HWID locking, expiry dates, Discord integration, and can be revoked at any time.",
  },
  {
    q: "Is my script safe on your servers?",
    a: "Yes. All scripts are stored encrypted at rest, transmitted over TLS, and only accessible to your account. We never share or inspect your code. Obfuscated output is delivered securely via loadstring-ready URLs.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team and we'll process your refund promptly.",
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [yearly, setYearly] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.97]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero gradient orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <motion.div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px]"
          animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[130px]"
          animate={{ y: [0, 25, 0], x: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-500/6 blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <PublicNavbar />

      {/* ===== HERO ===== */}
      <motion.section style={{ opacity: heroOpacity, scale: heroScale }} className="relative pt-32 md:pt-40 pb-20 md:pb-28">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Announcement pill */}
          <MotionDiv delay={0.1}>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/60 hover:text-white/80 transition-colors group mb-8"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              New: Discord bot integration available
              <ArrowUpRight className="h-3 w-3 text-white/30 group-hover:text-white/60 transition-colors" />
            </Link>
          </MotionDiv>

          <MotionDiv delay={0.2}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
              <span className="text-white/90">Protect your</span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                scripts.
              </span>
              <br />
              <span className="text-white/90">Control</span>{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                access.
              </span>
            </h1>
          </MotionDiv>

          <MotionDiv delay={0.3}>
            <p className="mx-auto max-w-2xl text-base sm:text-lg text-white/40 leading-relaxed mb-10">
              Professional key management, VM obfuscation, and script protection
              platform for Roblox developers. Secure your work and monetize your
              scripts with ease.
            </p>
          </MotionDiv>

          <MotionDiv delay={0.4}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="group relative inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 text-sm font-semibold text-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start for free
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-8 text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.2] transition-all"
              >
                Learn more
              </Link>
            </div>
          </MotionDiv>

          {/* Hero code block */}
          <MotionDiv delay={0.6} className="mt-16 max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl opacity-20 group-hover:opacity-30 blur-lg transition-opacity duration-500" />
              <div className="relative rounded-xl bg-[#0a0819]/90 backdrop-blur-sm border border-white/[0.08] p-4 text-left overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 text-xs text-white/20 font-mono">loadstring.luau</span>
                </div>
                <pre className="text-sm font-mono leading-relaxed overflow-x-auto">
                  <code>
                    <span className="text-white/20">local </span>
                    <span className="text-indigo-300">luau </span>
                    <span className="text-white/30">= </span>
                    <span className="text-cyan-300">require</span>
                    <span className="text-white/30">(</span>
                    <span className="text-amber-300">&quot;luau.uwu&quot;</span>
                    <span className="text-white/30">)</span>
                    {"\n"}
                    <span className="text-white/20">local </span>
                    <span className="text-indigo-300">key </span>
                    <span className="text-white/30">= </span>
                    <span className="text-indigo-300">luau</span>
                    <span className="text-white/30">:</span>
                    <span className="text-cyan-300">validate</span>
                    <span className="text-white/30">(</span>
                    <span className="text-amber-300">&quot;USER_KEY_HERE&quot;</span>
                    <span className="text-white/30">)</span>
                    {"\n\n"}
                    <span className="text-white/20">if </span>
                    <span className="text-indigo-300">key</span>
                    <span className="text-white/30">.</span>
                    <span className="text-indigo-300">valid </span>
                    <span className="text-white/20">then</span>
                    {"\n"}
                    <span className="text-white/30">  </span>
                    <span className="text-cyan-300">print</span>
                    <span className="text-white/30">(</span>
                    <span className="text-amber-300">&quot;Access granted!&quot;</span>
                    <span className="text-white/30">)</span>
                    {"\n"}
                    <span className="text-white/30">  </span>
                    <span className="text-cyan-300">loadstring</span>
                    <span className="text-white/30">(</span>
                    <span className="text-indigo-300">game</span>
                    <span className="text-white/30">:</span>
                    <span className="text-cyan-300">HttpGet</span>
                    <span className="text-white/30">(</span>
                    <span className="text-amber-300">&quot;SCRIPT_URL&quot;</span>
                    <span className="text-white/30">))()</span>
                    {"\n"}
                    <span className="text-white/20">else</span>
                    {"\n"}
                    <span className="text-white/30">  </span>
                    <span className="text-indigo-300">warn</span>
                    <span className="text-white/30">(</span>
                    <span className="text-amber-300">&quot;Invalid key&quot;</span>
                    <span className="text-white/30">)</span>
                    {"\n"}
                    <span className="text-white/20">end</span>
                  </code>
                </pre>
              </div>
            </div>
          </MotionDiv>
        </div>
      </motion.section>

      {/* ===== STATS ===== */}
      <section className="py-16 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionStagger className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {stats.map((stat) => (
              <MotionStaggerItem key={stat.label}>
                <div className="text-center group">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] mb-4 group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5 transition-all duration-300">
                    <stat.icon className="h-6 w-6 text-white/40 group-hover:text-indigo-400 transition-colors duration-300" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/30">{stat.label}</div>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              Everything you need
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              A complete{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                toolkit
              </span>
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto text-base">
              Everything you need to protect, manage, and distribute your Roblox scripts — all in one platform.
            </p>
          </MotionDiv>

          <MotionStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <MotionStaggerItem key={feature.title}>
                <div className="group relative rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-xl hover:shadow-black/20">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} bg-opacity-10 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 md:py-28 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6">
              <Play className="h-3.5 w-3.5 text-indigo-400" />
              Simple workflow
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Get started in{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                minutes
              </span>
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto text-base">
              Three simple steps to protect and distribute your scripts.
            </p>
          </MotionDiv>

          <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-1/3 left-[16%] right-[16%] h-px bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20" />

            {[
              { step: "01", title: "Upload your script", desc: "Add your Luau script to a project and configure obfuscation settings.", icon: FileCode },
              { step: "02", title: "Generate keys", desc: "Create license keys for your users with expiry dates and HWID binding.", icon: Key },
              { step: "03", title: "Users validate", desc: "Users include their key and the script validates server-side instantly.", icon: Shield },
            ].map((item, i) => (
              <MotionStaggerItem key={item.step}>
                <div className="text-center relative">
                  <div className="relative inline-flex mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/20">
                      <item.icon className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white shadow-lg">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white/90 mb-2">{item.title}</h3>
                  <p className="text-sm text-white/40 max-w-xs mx-auto">{item.desc}</p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ===== TERMINAL DEMO ===== */}
      <section className="py-20 md:py-28 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6">
              <Monitor className="h-3.5 w-3.5 text-indigo-400" />
              Interactive demo
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              See it in{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                action
              </span>
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto">
              Watch how easy it is to obfuscate and protect your scripts. Runs entirely in your browser.
            </p>
          </MotionDiv>

          <MotionDiv delay={0.2}>
            <TerminalDemo />
          </MotionDiv>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-20 md:py-28 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6">
              <Star className="h-3.5 w-3.5 text-indigo-400" />
              Simple pricing
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Plans for every{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                developer
              </span>
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto mb-8">
              Start free, upgrade when you need more. 7-day free trial on Pro — no credit card required.
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1.5">
              <button
                onClick={() => setYearly(false)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  !yearly ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/60"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  yearly ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/60"
                }`}
              >
                Yearly
                <span className="ml-1.5 text-xs text-emerald-400">Save 33%</span>
              </button>
            </div>
          </MotionDiv>

          <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <MotionStaggerItem key={plan.name}>
                <div
                  className={`relative rounded-xl p-6 md:p-8 h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-black/20 ${
                    plan.popular
                      ? "bg-gradient-to-b from-indigo-500/[0.08] to-transparent border border-indigo-500/25"
                      : "bg-white/[0.03] border border-white/[0.06]"
                  }`}
                >
                  {plan.popular && (
                    <>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-1 text-xs font-medium text-white shadow-lg shadow-indigo-500/25">
                        Most Popular
                      </div>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-indigo-500/[0.03] to-transparent pointer-events-none" />
                    </>
                  )}
                  <h3 className="text-lg font-semibold text-white/90">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-bold text-white">
                      {yearly ? plan.price.yearly : plan.price.monthly}
                    </span>
                    <span className="text-white/30">
                      {yearly ? plan.period.yearly : plan.period.monthly}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/40">{plan.description}</p>
                  {yearly && plan.name !== "Free" && (
                    <p className="mt-1 text-xs text-emerald-400/80">
                      ${plan.name === "Pro" ? "120" : "240"} billed annually
                    </p>
                  )}
                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature.text} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                            <Check className="h-3 w-3 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.04] shrink-0">
                            <X className="h-3 w-3 text-white/20" />
                          </div>
                        )}
                        <span className={feature.included ? "text-white/70" : "text-white/20"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-all ${
                      plan.popular
                        ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
                        : "border border-white/[0.12] text-white/70 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.2]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 md:py-28 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="relative rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.04] to-cyan-500/[0.08] border border-indigo-500/20 p-8 md:p-16 text-center overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <motion.div
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <Zap className="h-3.5 w-3.5 text-indigo-400" />
                Ready to get started?
              </motion.div>
              <motion.h2
                className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Start protecting your{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  scripts today
                </span>
              </motion.h2>
              <motion.p
                className="text-white/40 max-w-xl mx-auto mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Join thousands of Roblox developers who trust luau.uwu to protect their scripts. 
                Start free, no credit card required.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <Link
                  href="/signup"
                  className="group inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 text-sm font-semibold text-white transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    Get started free
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-8 text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.2] transition-all"
                >
                  Read the docs
                </Link>
              </motion.div>
            </div>
          </MotionDiv>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-20 md:py-28 border-t border-white/[0.04]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
              FAQ
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Frequently asked{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                questions
              </span>
            </h2>
            <p className="text-white/40">
              Everything you need to know about luau.uwu.
            </p>
          </MotionDiv>

          <MotionStagger>
            {faqs.map((faq, i) => (
              <MotionStaggerItem key={i}>
                <div className="border-b border-white/[0.06] last:border-0">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between py-5 text-left group"
                  >
                    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                      {faq.q}
                    </span>
                    <motion.div
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 ml-4 flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04]"
                    >
                      <ChevronDown className="h-3.5 w-3.5 text-white/40" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="pb-5 text-sm text-white/40 leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
