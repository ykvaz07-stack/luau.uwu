"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Check,
  Clock,
  X,
  ExternalLink,
  ArrowRight,
  Zap,
  Shield,
  Crown,
  Coins,
  User,
  HelpCircle,
  ChevronDown,
  Star,
  Calendar,
  Sparkles,
  Gem,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionDiv, MotionStagger, MotionStaggerItem } from "@/components/motion";
import type { Subscription, Purchase, PlanType } from "@/types";

const faqs = [
  {
    q: "How does the free trial work?",
    a: "You get full access to the Pro plan for 7 days with no payment required. No credit card needed. After 7 days, your account reverts to the Free plan unless you upgrade.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept PayPal (Friends & Family) and Litecoin (LTC). All payments are manually verified to ensure security.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades apply at the end of your current billing period.",
  },
  {
    q: "What happens when my subscription expires?",
    a: "If your subscription expires, your plan automatically downgrades to Free. Your projects and scripts remain intact, but you'll lose access to premium features until you upgrade again.",
  },
];

const planDetails = {
  free: { name: "Free", price: "$0", icon: Shield, color: "text-muted-foreground", gradient: "from-white/10 to-white/5" },
  pro: { name: "Pro", price: "$15/mo", icon: Zap, color: "text-[#22d3ee]", gradient: "from-[#6366f1]/20 to-[#22d3ee]/10" },
  premium: { name: "Premium", price: "$30/mo", icon: Crown, color: "text-yellow-500", gradient: "from-yellow-500/20 to-amber-500/10" },
};

const planFeatures = {
  free: ["1 Project", "2 Scripts", "25 Keys", "Basic Obfuscation"],
  pro: ["5 Projects", "15 Scripts", "1,000 Keys", "Full VM Obfuscation", "HWID Locking", "API Access", "Discord Bot"],
  premium: ["Unlimited Projects", "Unlimited Scripts", "10,000 Keys", "Full + Anti-Tamper", "HWID Locking", "API + Webhooks", "Custom Branding"],
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function TrialCountdown({ expiresAt }: { expiresAt: string }) {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const total = 7 * 24 * 60 * 60 * 1000;
  const elapsed = now - (expiry - total);
  const progress = Math.max(0, Math.min(100, ((total - (expiry - now)) / total) * 100));
  const daysLeft = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));

  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-20 h-20 shrink-0">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <motion.circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="url(#trialGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="trialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={daysLeft}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg font-bold text-white"
          >
            {daysLeft}
          </motion.span>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-white">Trial ends in</div>
        <div className="text-xs text-muted-foreground">
          {daysLeft === 1 ? "1 day remaining" : `${daysLeft} days remaining`}
        </div>
      </div>
    </div>
  );
}

function StarsBackground() {
  return (
    <div className="stars-bg" aria-hidden="true">
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            "--duration": `${2 + Math.random() * 4}s`,
            "--delay": `${Math.random() * 3}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState<PlanType | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserEmail(user.email);

    const [subRes, purchaseRes] = await Promise.all([
      supabase.from("subscriptions").select("*").single(),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
    ]);

    let subData = subRes.data;
    const checkRes = await fetch("/api/subscriptions/trial");
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.subscription) subData = checkData.subscription;
    }

    setSubscription(subData);
    setPurchases(purchaseRes.data ?? []);
    setLoading(false);
  }

  const currentPlan = subscription?.plan || "free";
  const isExpired = subscription?.expires_at && new Date(subscription.expires_at) < new Date();
  const onTrial = subscription?.plan === "pro" && subscription?.trial_used && !isExpired;

  function getFingerprint(): string {
    try {
      const scr = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const lang = navigator.language;
      const ua = navigator.userAgent.slice(0, 100);
      const hash = Array.from(scr + tz + lang + ua, (c) => c.charCodeAt(0).toString(16)).join("");
      return hash.slice(0, 64);
    } catch {
      return crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
    }
  }

  async function startFreeTrial() {
    if (startingTrial) return;
    setStartingTrial(true);
    setTrialError(null);
    try {
      const res = await fetch("/api/subscriptions/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: getFingerprint() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrialError(data.error || "Failed to start trial");
        setStartingTrial(false);
        return;
      }
      setStartingTrial(false);
      fetchData();
    } catch {
      setTrialError("Network error. Please try again.");
      setStartingTrial(false);
    }
  }

  return (
    <div className="space-y-6 relative">
      <StarsBackground />

      <div className="fixed inset-0 pointer-events-none -z-10">
        <motion.div
          className="absolute top-10 left-1/4 w-[350px] h-[350px] rounded-full bg-[#6366f1]/6 blur-[120px]"
          animate={{ y: [0, -15, 0], x: [0, 8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-1/4 w-[300px] h-[300px] rounded-full bg-[#22d3ee]/5 blur-[120px]"
          animate={{ y: [0, 12, 0], x: [0, -8, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <MotionDiv>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Billing
          </h1>
          <p className="text-muted-foreground">Manage your subscription and payment history.</p>
        </div>
      </MotionDiv>

      {/* Account Info */}
      <MotionDiv delay={0.05}>
        <div className="rounded-xl glass p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">{userEmail || "Loading..."}</div>
            <div className="text-xs text-muted-foreground">Account email</div>
          </div>
        </div>
      </MotionDiv>

      {/* Current Plan */}
      <MotionDiv delay={0.1}>
        <div className="relative rounded-xl gradient-border">
          <div className="rounded-xl p-6" style={{ background: "rgba(10, 8, 25, 0.6)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Current Plan</h2>
              {subscription?.trial_used && currentPlan === "free" && (
                <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">Trial used</span>
              )}
              {onTrial && (
                <span className="text-xs text-[#22d3ee] bg-[#22d3ee]/10 px-2 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Trial Active
                </span>
              )}
            </div>

            {loading ? (
              <div className="h-24 rounded-lg shimmer" />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className={`flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${planDetails[currentPlan as keyof typeof planDetails]?.gradient}`}
                >
                  {(() => {
                    const Icon = planDetails[currentPlan as keyof typeof planDetails]?.icon || Shield;
                    return <Icon className={`h-8 w-8 ${planDetails[currentPlan as keyof typeof planDetails]?.color}`} />;
                  })()}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`text-xl font-bold capitalize ${currentPlan !== "free" ? "gradient-text" : ""}`}>
                      {currentPlan}
                    </div>
                    {isExpired && (
                      <span className="text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">Expired</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentPlan === "free" && "Free forever"}
                    {currentPlan === "pro" && "$15/month"}
                    {currentPlan === "premium" && "$30/month"}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(planFeatures[currentPlan as keyof typeof planFeatures] || []).slice(0, 4).map((f) => (
                      <span key={f} className="text-[10px] bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full border border-white/5">
                        {f}
                      </span>
                    ))}
                    {planFeatures[currentPlan as keyof typeof planFeatures]?.length > 4 && (
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        +{planFeatures[currentPlan as keyof typeof planFeatures].length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2 sm:gap-3">
                  {onTrial && subscription?.expires_at && (
                    <TrialCountdown expiresAt={subscription.expires_at} />
                  )}

                  {currentPlan === "free" && !subscription?.trial_used && (
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <motion.button
                        onClick={startFreeTrial}
                        disabled={startingTrial}
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-5 text-sm font-medium text-white gap-2 disabled:opacity-50 glow-accent-sm"
                      >
                        {startingTrial ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                            />
                            Activating...
                          </>
                        ) : (
                          <>
                            Start Free Trial
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </motion.button>
                      {trialError && (
                        <motion.span
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-500"
                        >
                          {trialError}
                        </motion.span>
                      )}
                    </div>
                  )}

                  {currentPlan === "free" && subscription?.trial_used && (
                    <motion.button
                      onClick={() => setShowUpgradeModal("pro")}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-5 text-sm font-medium text-white gap-2 glow-accent-sm"
                    >
                      Upgrade to Pro
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  )}

                  {currentPlan === "pro" && !isExpired && (
                    <motion.button
                      onClick={() => setShowUpgradeModal("premium")}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-[#22d3ee]/30 px-5 text-sm font-medium text-[#22d3ee] gap-2 hover:bg-[#22d3ee]/5 transition-colors"
                    >
                      Upgrade to Premium
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  )}

                  {currentPlan !== "free" && isExpired && (
                    <motion.button
                      onClick={() => setShowUpgradeModal(currentPlan === "premium" ? "premium" : "pro")}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-5 text-sm font-medium text-white gap-2"
                    >
                      Resubscribe
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </MotionDiv>

      {/* Plan Comparison Strip */}
      <MotionDiv delay={0.15}>
        <div className="grid grid-cols-3 gap-3">
          {(["free", "pro", "premium"] as const).map((plan) => {
            const info = planDetails[plan];
            const Icon = info.icon;
            const isCurrent = currentPlan === plan;
            const features = planFeatures[plan];
            return (
              <motion.button
                key={plan}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (!isCurrent) setShowUpgradeModal(plan);
                }}
                className={`rounded-xl p-3 sm:p-4 text-left transition-all ${
                  isCurrent
                    ? "border border-[#6366f1]/30 bg-[#6366f1]/5 glow-accent-sm"
                    : "glass cursor-pointer hover:border-white/10"
                } ${plan === "pro" ? "relative" : ""}`}
              >
                {plan === "pro" && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] px-2 py-0.5 text-[10px] font-medium text-white whitespace-nowrap">
                    Popular
                  </div>
                )}
                <Icon className={`h-5 w-5 ${info.color} mb-1.5`} />
                <div className="text-sm font-semibold capitalize">{plan}</div>
                <div className="text-xs text-muted-foreground">{info.price}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {features.slice(0, 3).map((f) => (
                    <div key={f} className="w-1.5 h-1.5 rounded-full bg-primary/40" title={f} />
                  ))}
                  {features.length > 3 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </MotionDiv>

      {/* Payment History */}
      <MotionDiv delay={0.2}>
        <div className="rounded-xl glass p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Payment History
          </h2>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No payments yet.</p>
          ) : (
            <MotionStagger className="space-y-2">
              {purchases.map((purchase) => (
                <MotionStaggerItem key={purchase.id}>
                  <motion.div
                    whileHover={{ x: 3, borderColor: "rgba(99, 102, 241, 0.2)" }}
                    className="flex items-center justify-between rounded-lg bg-white/3 border border-white/5 p-3 sm:p-4 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0 ${
                        purchase.payment_method === "paypal" ? "bg-[#0070ba]/15" : "bg-yellow-500/10"
                      }`}>
                        {purchase.payment_method === "paypal" ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5 text-[#0070ba]" fill="currentColor">
                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
                          </svg>
                        ) : (
                          <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium capitalize truncate">{purchase.plan} Plan</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{purchase.payment_method === "paypal" ? "PayPal" : "Litecoin"}</span>
                          <span>&middot;</span>
                          <span>{timeAgo(purchase.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                      <span className="text-sm font-medium">${purchase.amount}</span>
                      {purchase.status === "pending" && (
                        <motion.span
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500"
                        >
                          <Clock className="h-3 w-3" />
                          Pending
                        </motion.span>
                      )}
                      {purchase.status === "approved" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500 border border-emerald-500/20">
                          <Check className="h-3 w-3" />
                          Approved
                        </span>
                      )}
                      {purchase.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                          <X className="h-3 w-3" />
                          Rejected
                        </span>
                      )}
                    </div>
                  </motion.div>
                </MotionStaggerItem>
              ))}
            </MotionStagger>
          )}
        </div>
      </MotionDiv>

      {/* FAQ */}
      <MotionDiv delay={0.25}>
        <div className="rounded-xl glass p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            Billing FAQ
          </h2>
          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-white/5 last:border-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-4 text-left group"
                >
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 ml-4"
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                      <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </MotionDiv>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          targetPlan={showUpgradeModal}
          currentPlan={currentPlan as PlanType}
          onClose={() => setShowUpgradeModal(null)}
          onSubmitted={() => {
            setShowUpgradeModal(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function UpgradeModal({
  targetPlan,
  currentPlan,
  onClose,
  onSubmitted,
}: {
  targetPlan: PlanType;
  currentPlan: PlanType;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState<"method" | "details" | "submit">("method");
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "crypto" | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [txId, setTxId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const prices = {
    pro: { usd: 15, ltc: "0.12" },
    premium: { usd: 30, ltc: "0.24" },
  };
  const price = prices[targetPlan as keyof typeof prices];

  const allFeatures = [
    { name: "Projects", free: "1", pro: "5", premium: "Unlimited" },
    { name: "Scripts", free: "2", pro: "15", premium: "Unlimited" },
    { name: "Keys", free: "25", pro: "1,000", premium: "10,000" },
    { name: "VM Obfuscation", free: "Basic", pro: "Full", premium: "Full + Anti-Tamper" },
    { name: "HWID Locking", free: false, pro: true, premium: true },
    { name: "API Access", free: false, pro: true, premium: true },
    { name: "Discord Bot", free: false, pro: true, premium: true },
    { name: "Custom Branding", free: false, pro: false, premium: true },
  ];

  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then((res: { data: { user: { email?: string } | null } }) => {
        if (res.data.user?.email) setUserEmail(res.data.user.email);
      });
    }
  }, []);

  async function handleSubmit() {
    if (!paymentMethod || !proofFile) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const fileExt = proofFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { data: uploadData } = await supabase.storage.from("payment-proofs").upload(fileName, proofFile);
      let proofUrl = "";
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(uploadData.path);
        proofUrl = urlData.publicUrl;
      }
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("purchases").insert({
        user_id: user?.id,
        plan: targetPlan,
        amount: price.usd,
        currency: "USD",
        payment_method: paymentMethod,
        crypto_address: paymentMethod === "crypto" ? "LVqWz48gvDtJ1bDEsCykUjGsEE5m1ERViJ" : null,
        crypto_amount: paymentMethod === "crypto" ? price.ltc : null,
        proof_url: proofUrl,
        transaction_id: txId || null,
        status: "pending",
      });
      onSubmitted();
    } catch (err) {
      console.error("Submit error:", err);
    }
    setSubmitting(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-lg rounded-xl glass-modal p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {targetPlan === "premium" ? (
              <Crown className="h-5 w-5 text-yellow-500" />
            ) : (
              <Zap className="h-5 w-5 text-[#22d3ee]" />
            )}
            <h2 className="text-lg font-semibold capitalize">Upgrade to {targetPlan}</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(["method", "details", "submit"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <motion.div
                animate={{
                  backgroundColor: step === s ? "#6366f1" : "rgba(255,255,255,0.1)",
                  scale: step === s ? 1.1 : 1,
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
              >
                {step === "details" && i <= 1 ? <Check className="h-3 w-3" /> : i + 1}
              </motion.div>
              {i < 2 && <div className="flex-1 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Feature comparison */}
        <div className="mb-6 rounded-lg bg-white/3 border border-white/5 overflow-hidden">
          <div className="grid grid-cols-4 gap-px bg-white/5 text-xs font-medium">
            <div className="p-2 bg-background" />
            <div className="p-2 bg-background text-center text-muted-foreground">Current</div>
            <div className="p-2 bg-background text-center text-primary">{targetPlan}</div>
            <div className="p-2 bg-background text-center text-muted-foreground">{targetPlan === "premium" ? "Pro" : "Premium"}</div>
          </div>
          {allFeatures.map((f) => {
            const current = f[currentPlan as keyof typeof f];
            const target = f[targetPlan as keyof typeof f];
            return (
              <div key={f.name} className="grid grid-cols-4 gap-px bg-white/5 text-xs">
                <div className="p-2 bg-background font-medium">{f.name}</div>
                <div className={`p-2 bg-background text-center ${current ? "" : "text-muted-foreground/50"}`}>
                  {typeof current === "boolean" ? (current ? <Check className="h-3 w-3 mx-auto text-muted-foreground" /> : <X className="h-3 w-3 mx-auto text-muted-foreground/30" />) : current}
                </div>
                <div className="p-2 bg-background text-center text-[#22d3ee] font-medium">
                  {typeof target === "boolean" ? <Check className="h-3 w-3 mx-auto" /> : target}
                </div>
                <div className="p-2 bg-background text-center text-muted-foreground/50">
                  {f[targetPlan === "premium" ? "pro" : "premium" as keyof typeof f] === undefined ? "-" :
                    typeof f[targetPlan === "premium" ? "pro" : "premium" as keyof typeof f] === "boolean"
                      ? <Check className="h-3 w-3 mx-auto" />
                      : f[targetPlan === "premium" ? "pro" : "premium" as keyof typeof f]}
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === "method" && (
            <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <p className="text-sm text-muted-foreground">Choose your payment method for the {targetPlan} plan.</p>
              <motion.button
                whileHover={{ scale: 1.01, borderColor: "rgba(0,112,186,0.3)" }}
                whileTap={{ scale: 0.99 }}
                onClick={() => { setPaymentMethod("paypal"); setStep("details"); }}
                className="w-full flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/8 transition-all group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0070ba]/15">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#0070ba]" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold flex items-center gap-2">PayPal <span className="text-xs text-muted-foreground font-normal">(Friends & Family)</span></div>
                  <div className="text-sm text-muted-foreground">Send ${price.usd} to paypal.me/therealxyra</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors shrink-0" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01, borderColor: "rgba(234,179,8,0.3)" }}
                whileTap={{ scale: 0.99 }}
                onClick={() => { setPaymentMethod("crypto"); setStep("details"); }}
                className="w-full flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/8 transition-all group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Coins className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold flex items-center gap-2">Litecoin <span className="text-xs text-muted-foreground font-normal">(LTC)</span></div>
                  <div className="text-sm text-muted-foreground">Send {price.ltc} LTC to the address below</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-yellow-500 transition-colors shrink-0" />
              </motion.button>
            </motion.div>
          )}

          {step === "details" && paymentMethod && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {userEmail && (
                <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-sm"><span className="text-muted-foreground">Paying as </span>{userEmail}</div>
                </div>
              )}
              {paymentMethod === "paypal" && (
                <div className="rounded-lg bg-[#0070ba]/10 border border-[#0070ba]/20 p-4">
                  <div className="text-sm font-medium mb-2">PayPal Friends & Family</div>
                  <div className="text-sm text-muted-foreground mb-3">Send <span className="text-white font-bold">${price.usd}</span> to:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black/30 rounded px-3 py-2 text-sm font-mono text-blue-300">paypal.me/therealxyra</code>
                    <CopyButton text="paypal.me/therealxyra" />
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">Make sure to send as <span className="text-white">Friends & Family</span> to avoid fees.</div>
                </div>
              )}
              {paymentMethod === "crypto" && (
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
                  <div className="text-sm font-medium mb-2">Litecoin (LTC)</div>
                  <div className="text-sm text-muted-foreground mb-3">Send <span className="text-white font-bold">{price.ltc} LTC</span> to:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black/30 rounded px-3 py-2 text-sm font-mono text-yellow-300 break-all">LVqWz48gvDtJ1bDEsCykUjGsEE5m1ERViJ</code>
                    <CopyButton text="LVqWz48gvDtJ1bDEsCykUjGsEE5m1ERViJ" />
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">Send the exact amount. Your transaction will be verified automatically.</div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction ID (optional)</label>
                <input
                  type="text"
                  placeholder="Paste your transaction ID here..."
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  className="flex h-10 w-full rounded-lg glass-input px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep("method")} className="flex-1 h-10 rounded-lg border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors">Back</button>
                <button onClick={() => setStep("submit")} className="flex-1 h-10 rounded-lg gradient-accent text-sm font-medium text-white hover:opacity-90 transition-opacity">Next</button>
              </div>
            </motion.div>
          )}

          {step === "submit" && (
            <motion.div key="submit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="text-sm text-muted-foreground">Upload a screenshot of your payment confirmation.</div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Proof</label>
                <div className="relative">
                  <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="hidden" id="proof-upload" />
                  <label htmlFor="proof-upload" className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-white/10 bg-white/3 cursor-pointer hover:bg-white/5 hover:border-primary/30 transition-all">
                    {proofFile ? (
                      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center">
                        <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <div className="text-sm font-medium">{proofFile.name}</div>
                        <div className="text-xs text-muted-foreground">{(proofFile.size / 1024).toFixed(1)} KB</div>
                      </motion.div>
                    ) : (
                      <div className="text-center">
                        <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground">Click to upload screenshot</div>
                        <div className="text-xs text-muted-foreground/60">PNG, JPG up to 5MB</div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep("details")} className="flex-1 h-10 rounded-lg border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors">Back</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={submitting || !proofFile}
                  className="flex-1 h-10 rounded-lg gradient-accent text-sm font-medium text-white disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Payment"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
    >
      {copied ? (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-400">Copied!</motion.span>
      ) : (
        "Copy"
      )}
    </motion.button>
  );
}
