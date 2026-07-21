import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { LuaCryptLogo } from "@/components/layout/logo";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Docs", href: "/docs" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "API Reference", href: "/docs/api" },
      { label: "Getting Started", href: "/docs/getting-started" },
      { label: "Obfuscation Guide", href: "/docs/obfuscation" },
      { label: "Discord Bot", href: "/docs/discord-bot" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-emerald-500/10 bg-[#050a05]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <LuaCryptLogo />
            </Link>
            <p className="text-sm text-white/40 max-w-xs leading-relaxed">
              Enterprise-grade VM obfuscation, license key management, and script protection for Luau developers.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://discord.gg/luacrypt"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/luacrypt"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 hover:text-emerald-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} LuaCrypt. Not affiliated with Roblox Corporation.
          </p>
          <p className="text-xs text-white/20">
            Built for the Roblox developer community.
          </p>
        </div>
      </div>
    </footer>
  );
}
