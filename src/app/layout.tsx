import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LuaCrypt — Script Protection & Key Management",
  description:
    "Enterprise-grade VM obfuscation, license key management with HWID locking, and secure script hosting for Luau developers.",
  keywords: ["luau", "lua", "obfuscation", "key system", "script protection", "hwid", "luacrypt"],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "LuaCrypt — Script Protection & Key Management",
    description: "Enterprise-grade VM obfuscation, key management, and script protection for Luau developers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <StarsBackground />
        {children}
      </body>
    </html>
  );
}

function StarsBackground() {
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    duration: 3 + Math.random() * 5,
    delay: Math.random() * 6,
  }));

  return (
    <div className="stars-bg" aria-hidden="true">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            "--duration": `${star.duration}s`,
            "--delay": `${star.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
