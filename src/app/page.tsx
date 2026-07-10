"use client";

import Link from "next/link";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { MotionDiv, MotionStagger, MotionStaggerItem } from "@/components/motion";

const features = [
  { icon: Key, title: "Key System", description: "Generate, manage, and validate license keys with HWID locking and expiry support." },
  { icon: Shield, title: "VM Obfuscation", description: "Register-based VM protection, string encryption, and control flow flattening powered by luau.uwu." },
  { icon: Code, title: "Script Hosting", description: "Upload and version your scripts with loadstring-ready download URLs." },
  { icon: Zap, title: "Instant Validation", description: "Sub-50ms key validation API with 99.9% uptime for your Roblox games." },
  { icon: Lock, title: "HWID Locking", description: "Bind keys to hardware IDs to prevent sharing and unauthorized access." },
  { icon: BarChart3, title: "Analytics", description: "Track executions, active users, and key usage with real-time dashboards." },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
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
    price: "$15",
    period: "/month",
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
    price: "$30",
    period: "/month",
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

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-hidden grid-bg">
      {/* Floating gradient orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <motion.div
          className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[120px]"
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform" }}
        />
        <motion.div
          className="absolute bottom-40 right-1/4 w-[350px] h-[350px] rounded-full bg-[#c44dff]/8 blur-[120px]"
          animate={{ y: [0, 15, 0], x: [0, -10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-[250px] h-[250px] rounded-full bg-[#ff6b9d]/5 blur-[100px]"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform" }}
        />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-header">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-accent">
                <Cat className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text-animated">luau.uwu</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
              <Link href="/signup" className="inline-flex h-9 items-center justify-center rounded-lg gradient-accent px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <MotionDiv delay={0.1}>
            <div className="inline-flex items-center gap-2 rounded-full glass-badge px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Built for Roblox developers
            </div>
          </MotionDiv>

          <MotionDiv delay={0.2}>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Protect your <span className="gradient-text">scripts.</span>
              <br />
              Control <span className="gradient-text">access.</span>
            </h1>
          </MotionDiv>

          <MotionDiv delay={0.3}>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
              Professional key management, VM obfuscation, and script protection
              platform for Roblox developers. Secure your work and monetize your scripts with ease.
            </p>
          </MotionDiv>

          <MotionDiv delay={0.4}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-lg gradient-accent px-8 text-sm font-medium text-white hover:opacity-90 transition-opacity gap-2 glow-pink"
              >
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/10 px-8 text-sm font-medium hover:bg-white/5 transition-colors gap-2"
              >
                Learn more
              </Link>
            </div>
          </MotionDiv>

          <MotionDiv delay={0.6} className="mt-16 max-w-2xl mx-auto">
            <div className="rounded-xl glass p-4 text-left">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs text-muted-foreground/50 font-mono">loadstring.luau</span>
              </div>
              <pre className="text-sm font-mono text-muted-foreground/80 overflow-x-auto">
                <code>{`local luau = require("luau.uwu")
local key = luau:validate("USER_KEY_HERE")

if key.valid then
  print("Access granted! Welcome, " .. key.user)
  loadstring(game:HttpGet("YOUR_SCRIPT_URL"))()
else
  warn("Invalid key: " .. key.reason)
end`}</code>
              </pre>
            </div>
          </MotionDiv>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete toolkit for protecting, managing, and distributing your Roblox scripts.
            </p>
          </MotionDiv>
          <MotionStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <MotionStaggerItem key={feature.title}>
                <div className="group rounded-xl glass-card p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Get started in minutes with our simple workflow.</p>
          </MotionDiv>
          <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Upload your script", desc: "Add your Luau script to a project and configure settings." },
              { step: "02", title: "Generate keys", desc: "Create license keys for your users with expiry and HWID options." },
              { step: "03", title: "Users validate", desc: "Users include the key in their script and it validates server-side." },
            ].map((item) => (
              <MotionStaggerItem key={item.step}>
                <div className="text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-2xl font-bold text-primary mb-6">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you need more. 7-day free trial on Pro.
            </p>
          </MotionDiv>
          <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <MotionStaggerItem key={plan.name}>
                <div
                  className={`relative rounded-xl p-6 h-full flex flex-col ${
                    plan.popular
                      ? "glass border-primary/30 shadow-lg glow-pink"
                      : "glass"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-accent px-3 py-1 text-xs font-medium text-white">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature.text} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground/50"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-8 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      plan.popular
                        ? "gradient-accent text-white hover:opacity-90"
                        : "border border-white/10 hover:bg-white/5"
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

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-accent">
                <Cat className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold gradient-text-animated">luau.uwu</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for Roblox developers. Not affiliated with Roblox Corporation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
