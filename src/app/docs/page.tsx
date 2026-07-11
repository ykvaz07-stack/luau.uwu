"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Code, Bot, Cpu, Sparkles } from "lucide-react";
import { MotionDiv, MotionStagger, MotionStaggerItem } from "@/components/motion";

const docCards = [
  {
    title: "Getting Started",
    desc: "Learn how to sign up, create your first project, upload scripts, and generate license keys.",
    icon: BookOpen,
    href: "/docs/getting-started",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    title: "Obfuscation Guide",
    desc: "Understand VM obfuscation levels, how to configure protections, and best practices.",
    icon: Cpu,
    href: "/docs/obfuscation",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    title: "API Reference",
    desc: "Complete API documentation for key validation, script delivery, and webhooks.",
    icon: Code,
    href: "/docs/api",
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    title: "Discord Bot",
    desc: "Set up and configure the Discord bot for automated key management and whitelisting.",
    icon: Bot,
    href: "/docs/discord-bot",
    gradient: "from-amber-500 to-orange-500",
  },
];

export default function DocsPage() {
  return (
    <div>
      <MotionDiv>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-sm text-white/50 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          Documentation
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Welcome to the{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">luau.uwu</span> docs
        </h1>
        <p className="text-white/40 mb-10 max-w-2xl leading-relaxed">
          Everything you need to get started with luau.uwu — from setting up your first project to integrating the API and Discord bot.
        </p>
      </MotionDiv>

      <MotionStagger className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docCards.map((card) => (
          <MotionStaggerItem key={card.href}>
            <Link
              href={card.href}
              className="group block rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} mb-4`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white/90 mb-2 group-hover:text-white transition-colors">{card.title}</h2>
              <p className="text-sm text-white/40 leading-relaxed mb-4">{card.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm text-indigo-400 group-hover:text-indigo-300 transition-colors">
                Read more
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </MotionStaggerItem>
        ))}
      </MotionStagger>

      {/* Need help section */}
      <MotionDiv className="mt-12 rounded-xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h3 className="font-semibold text-white/80 mb-2">Need help?</h3>
        <p className="text-sm text-white/40 mb-4">
          Can&apos;t find what you&apos;re looking for? Join our Discord community for support.
        </p>
        <a
          href="https://discord.gg/luauuwu"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 text-sm font-medium text-white"
        >
          Join Discord
        </a>
      </MotionDiv>
    </div>
  );
}
