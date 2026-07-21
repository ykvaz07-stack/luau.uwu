"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, Search, MessageCircle, ArrowRight, Sparkles } from "lucide-react";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { MotionDiv, MotionStagger, MotionStaggerItem } from "@/components/motion";

const categories = [
  {
    title: "General",
    questions: [
      { q: "What is LuaCrypt?", a: "LuaCrypt is a professional key management, VM obfuscation, and script protection platform built specifically for Roblox developers. We help you secure your Luau scripts and control access with license keys." },
      { q: "Is LuaCrypt free to use?", a: "Yes! We offer a generous free plan with 1 project, 2 scripts, and 25 keys. When you need more, upgrade to Pro or Premium starting at just $10/month." },
      { q: "Who is LuaCrypt for?", a: "LuaCrypt is designed for Roblox script developers who want to protect their work, manage access with license keys, and monetize their scripts securely." },
      { q: "Do I need coding experience?", a: "Basic knowledge of Lua/Luau is helpful, but our system is designed to be easy to use. Upload your script, generate keys, and you're ready to go." },
    ],
  },
  {
    title: "Obfuscation",
    questions: [
      { q: "How does VM obfuscation work?", a: "Our VM obfuscation transforms your Luau bytecode into a register-based virtual machine that runs inside a custom VM interpreter. The original code is never exposed, making reverse engineering extremely difficult." },
      { q: "Will obfuscation slow down my script?", a: "Performance overhead is minimal — typically under 5%. Our VM is optimized for speed and only adds a small bootstrapping cost." },
      { q: "Can I choose the obfuscation level?", a: "Yes! You can choose from Basic, Normal, Full, and Maximum obfuscation levels. Higher levels apply more protections like control flow flattening, MBA expressions, and anti-tamper." },
      { q: "Is the obfuscation reversible?", a: "VM obfuscation is one-way. Once obfuscated, the original code cannot be recovered from the VM bytecode. Always keep backups of your original scripts." },
    ],
  },
  {
    title: "Keys & HWID",
    questions: [
      { q: "How do license keys work?", a: "Generate keys from your dashboard and assign them to users. When a user runs your script, it validates the key server-side through our API. If valid, the script executes; if not, it blocks." },
      { q: "What is HWID locking?", a: "Hardware ID locking binds a license key to a specific computer's hardware signature. This prevents users from sharing keys across multiple machines." },
      { q: "Can I reset a user's HWID?", a: "Yes. From your dashboard, you can reset a user's HWID, allowing them to bind the key to a new machine. Users can also request HWID resets through the Discord bot." },
      { q: "Can I revoke a key?", a: "Absolutely. Keys can be revoked, banned, or deleted at any time from your dashboard. Revoked keys will immediately stop working." },
    ],
  },
  {
    title: "Billing & Plans",
    questions: [
      { q: "Can I switch plans?", a: "Yes! Upgrade or downgrade at any time. Upgrades take effect immediately, downgrades apply at the end of your billing period." },
      { q: "What is your refund policy?", a: "We offer a 7-day money-back guarantee on all paid plans. Contact our support team within 7 days of purchase for a full refund." },
      { q: "What payment methods do you accept?", a: "We accept PayPal, credit/debit cards, and Litecoin cryptocurrency." },
      { q: "Do you offer discounts?", a: "Yearly plans save you up to 33% compared to monthly billing. We also occasionally offer promotional discounts — join our Discord to stay updated." },
    ],
  },
  {
    title: "Discord Bot",
    questions: [
      { q: "What can the Discord bot do?", a: "The bot allows users to whitelist themselves, reset their HWID, retrieve their script, and check key status — all through Discord commands. Developers can manage keys and users directly from Discord." },
      { q: "How do I set up the bot?", a: "Invite the bot to your server using the invite link from your dashboard, then authenticate with your API key using the /login command. Full setup instructions are in our docs." },
      { q: "Is the bot required?", a: "No, the bot is optional. All features are available through the web dashboard and API. The bot simply provides a convenient Discord interface." },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const toggle = (key: string) => setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = categories.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q =>
      !search || q.q.toLowerCase().includes(search.toLowerCase()) || q.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/3 w-[400px] h-[400px] rounded-full bg-emerald-500/6 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-lime-500/5 blur-[100px]" />
      </div>

      <PublicNavbar />

      <section className="relative pt-32 pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <MotionDiv className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/8 border border-emerald-500/15 px-4 py-1.5 text-sm text-emerald-300/80 mb-6">
              <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
              FAQ
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Frequently asked{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-lime-400 bg-clip-text text-transparent">
                questions
              </span>
            </h1>
            <p className="text-white/40 max-w-xl mx-auto">
              Can&apos;t find what you&apos;re looking for? Reach out on Discord.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto mt-8">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 rounded-xl bg-emerald-500/5 border border-emerald-500/10 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/30 focus:bg-emerald-500/8 transition-all"
              />
            </div>
          </MotionDiv>

          {filtered.map((category) => (
            <div key={category.title} className="mb-10">
              <MotionDiv className="mb-4">
                <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider">{category.title}</h2>
              </MotionDiv>
              <MotionStagger>
                {category.questions.map((item) => {
                  const key = `${category.title}-${item.q}`;
                  const isOpen = openItems[key];
                  return (
                    <MotionStaggerItem key={key}>
                      <div className="border-b border-emerald-500/8 last:border-0">
                        <button
                          onClick={() => toggle(key)}
                          className="w-full flex items-center justify-between py-4 text-left group"
                        >
                          <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{item.q}</span>
                          <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0 ml-4 flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04]"
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-white/40" />
                          </motion.div>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <p className="pb-4 text-sm text-white/40 leading-relaxed">{item.a}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </MotionStaggerItem>
                  );
                })}
              </MotionStagger>
            </div>
          ))}

          {filtered.length === 0 && (
            <MotionDiv className="text-center py-16">
              <HelpCircle className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 mb-2">No results found</p>
              <p className="text-white/20 text-sm">Try different search terms</p>
            </MotionDiv>
          )}

          {/* Still have questions */}
          <MotionDiv className="relative rounded-2xl bg-gradient-to-br from-emerald-500/[0.06] to-lime-500/[0.06] border border-emerald-500/15 p-8 md:p-10 text-center mt-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px]" />
            <div className="relative z-10">
              <MessageCircle className="h-8 w-8 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Still have questions?</h2>
              <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">
                Our team is ready to help. Join our Discord community or check the documentation.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="https://discord.gg/luauuwu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-emerald-500/25"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Join Discord
                </a>
                <Link
                  href="/docs"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.12] px-5 text-sm font-medium text-white/70 hover:text-white transition-all"
                >
                  Read the docs
                </Link>
              </div>
            </div>
          </MotionDiv>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
