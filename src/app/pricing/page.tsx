"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles, ArrowRight, Star, HelpCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { MotionDiv, MotionStagger, MotionStaggerItem } from "@/components/motion";

const plans = [
  {
    name: "Free",
    price: { monthly: "$0", yearly: "$0" },
    period: { monthly: "/month", yearly: "/year" },
    desc: "Perfect for trying out luau.uwu",
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
    desc: "For developers with growing scripts",
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
    saveText: "Save $60/year",
  },
  {
    name: "Premium",
    price: { monthly: "$30", yearly: "$20" },
    period: { monthly: "/month", yearly: "/month" },
    desc: "For professional script developers",
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
    saveText: "Save $120/year",
  },
];

const faqs = [
  { q: "Can I switch plans anytime?", a: "Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades apply at the end of your billing period." },
  { q: "Do you offer refunds?", a: "We offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team and we'll process your refund." },
  { q: "What payment methods do you accept?", a: "We accept PayPal, credit/debit cards, and cryptocurrency (Litecoin). All payments are processed securely." },
  { q: "Can I have multiple projects?", a: "Yes! The number of projects depends on your plan. Free gets 1 project, Pro gets 5, and Premium gets unlimited." },
  { q: "What happens when I upgrade?", a: "Your limits increase immediately. You can create more projects, upload more scripts, and generate more keys right away." },
  { q: "Is my data safe?", a: "Absolutely. All scripts are encrypted at rest and transmitted over TLS. We never share or inspect your code." },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/8 blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/6 blur-[120px]" />
      </div>

      <PublicNavbar />

      <section className="relative pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Pricing
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4">
              Simple, transparent{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                pricing
              </span>
            </h1>
            <p className="text-white/40 max-w-xl mx-auto mb-8">
              Start free, upgrade when you need more. 7-day free trial on Pro — no credit card required.
            </p>

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
                <span className="ml-1.5 text-xs text-emerald-400">Save up to 33%</span>
              </button>
            </div>
          </MotionDiv>

          <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
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
                    <span className="text-white/30 text-sm">
                      {yearly ? plan.period.yearly : plan.period.monthly}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/40">{plan.desc}</p>
                  {yearly && plan.name !== "Free" && (
                    <p className="mt-1 text-xs text-emerald-400/80">
                      {plan.name === "Pro" ? "$120" : "$240"} billed annually
                    </p>
                  )}

                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-center gap-2 text-sm">
                        {f.included ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                            <Check className="h-3 w-3 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.04] shrink-0">
                            <X className="h-3 w-3 text-white/20" />
                          </div>
                        )}
                        <span className={f.included ? "text-white/70" : "text-white/20"}>{f.text}</span>
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

          {/* Trusted by */}
          <MotionDiv delay={0.3} className="mt-20 text-center">
            <p className="text-xs text-white/20 uppercase tracking-wider mb-6">Trusted by Roblox developers worldwide</p>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {["Key", "Script", "Obfuscation", "Protection", "Security", "Bot"].map((w) => (
                <span key={w} className="text-sm text-white/20 font-medium tracking-wider">{w}</span>
              ))}
            </div>
          </MotionDiv>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
              Billing FAQ
            </div>
            <h2 className="text-3xl font-bold">Pricing{" "}<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">questions</span></h2>
          </div>

          <MotionStagger>
            {faqs.map((faq, i) => (
              <MotionStaggerItem key={i}>
                <div className="border-b border-white/[0.06] last:border-0">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between py-5 text-left group"
                  >
                    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{faq.q}</span>
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

      {/* CTA */}
      <section className="py-16 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="relative rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.04] to-cyan-500/[0.08] border border-indigo-500/20 p-8 md:p-16 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to get{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">started</span>?
              </h2>
              <p className="text-white/40 max-w-lg mx-auto mb-8">
                Join thousands of developers who trust luau.uwu. Start free and upgrade when you need more.
              </p>
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-8 text-sm font-semibold text-white transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-[1.02]"
              >
                <span className="flex items-center gap-2">
                  Start for free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </MotionDiv>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
