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
} from "lucide-react";
import { MotionDiv, MotionStagger, MotionStaggerItem } from "@/components/motion";
import type { Subscription, Purchase, PlanType } from "@/types";

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState<PlanType | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserEmail(user.email);

    const [subRes, purchaseRes] = await Promise.all([
      supabase.from("subscriptions").select("*").single(),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
    ]);

    setSubscription(subRes.data);
    setPurchases(purchaseRes.data ?? []);
    setLoading(false);
  }

  const [startingTrial, setStartingTrial] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);

  const planDetails = {
    free: { name: "Free", price: "$0", icon: Shield, color: "text-muted-foreground" },
    pro: { name: "Pro", price: "$15/mo", icon: Zap, color: "text-primary" },
    premium: { name: "Premium", price: "$30/mo", icon: Crown, color: "text-yellow-500" },
  };

  const currentPlan = subscription?.plan || "free";
  const isExpired = subscription?.expires_at && new Date(subscription.expires_at) < new Date();

  async function startFreeTrial() {
    if (startingTrial) return;
    setStartingTrial(true);
    setTrialError(null);

    try {
      const res = await fetch("/api/subscriptions/trial", { method: "POST" });
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
    <div className="space-y-6">
      <MotionDiv>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Billing
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription and payment history.
          </p>
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
        <div className="rounded-xl glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Current Plan</h2>
            {subscription?.trial_used && currentPlan === "free" && (
              <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
                Trial used
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-20 rounded-lg bg-white/3 animate-pulse" />
          ) : (
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-white/5`}>
                {(() => {
                  const Icon = planDetails[currentPlan as keyof typeof planDetails]?.icon || Shield;
                  return <Icon className={`h-7 w-7 ${planDetails[currentPlan as keyof typeof planDetails]?.color}`} />;
                })()}
              </div>
              <div>
                <div className="text-xl font-bold capitalize">{currentPlan}</div>
                <div className="text-sm text-muted-foreground">
                  {currentPlan === "free" && "Free forever"}
                  {currentPlan === "pro" && "$15/month"}
                  {currentPlan === "premium" && "$30/month"}
                  {isExpired && (
                    <span className="text-red-500 ml-2">(Expired)</span>
                  )}
                </div>
              </div>
              {currentPlan === "free" && !subscription?.trial_used && (
                <div className="ml-auto flex flex-col items-end gap-1">
                  <button
                    onClick={startFreeTrial}
                    disabled={startingTrial}
                    className="inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity gap-2 disabled:opacity-50"
                  >
                    {startingTrial ? "Activating..." : "Start Free Trial"}
                    {!startingTrial && <ArrowRight className="h-4 w-4" />}
                  </button>
                  {trialError && (
                    <span className="text-xs text-red-500">{trialError}</span>
                  )}
                </div>
              )}
              {currentPlan === "free" && subscription?.trial_used && (
                <button
                  onClick={() => setShowUpgradeModal("pro")}
                  className="ml-auto inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity gap-2"
                >
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {currentPlan === "pro" && (
                <button
                  onClick={() => setShowUpgradeModal("premium")}
                  className="ml-auto inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity gap-2"
                >
                  Upgrade to Premium
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </MotionDiv>

      {/* Payment History */}
      <MotionDiv delay={0.2}>
        <div className="rounded-xl glass p-6">
          <h2 className="text-lg font-semibold mb-4">Payment History</h2>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between rounded-lg bg-white/3 border border-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                      {purchase.payment_method === "paypal" ? (
                        <CreditCard className="h-5 w-5 text-blue-400" />
                      ) : (
                        <Coins className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium capitalize">
                        {purchase.plan} Plan — ${purchase.amount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {purchase.payment_method === "paypal" ? "PayPal" : "Litecoin"} &middot;{" "}
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div>
                    {purchase.status === "pending" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-500">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                    {purchase.status === "approved" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500">
                        <Check className="h-3 w-3" />
                        Approved
                      </span>
                    )}
                    {purchase.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                        <X className="h-3 w-3" />
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </MotionDiv>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          targetPlan={showUpgradeModal}
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
  onClose,
  onSubmitted,
}: {
  targetPlan: PlanType;
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
      const { data: uploadData } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, proofFile);

      let proofUrl = "";
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(uploadData.path);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl glass-modal p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold capitalize">
            Upgrade to {targetPlan}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "method" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose your payment method for the {targetPlan} plan ({price.usd}/month).
            </p>

            <button
              onClick={() => {
                setPaymentMethod("paypal");
                setStep("details");
              }}
              className="w-full flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/8 hover:border-blue-500/30 transition-all group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0070ba]/15">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#0070ba]" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold flex items-center gap-2">
                  PayPal
                  <span className="text-xs text-muted-foreground font-normal">(Friends & Family)</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Send ${price.usd} to paypal.me/therealxyra
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
            </button>

            <button
              onClick={() => {
                setPaymentMethod("crypto");
                setStep("details");
              }}
              className="w-full flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/8 hover:border-yellow-500/30 transition-all group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#bfbbbb]/15">
                <Coins className="h-6 w-6 text-[#bfbbbb]" />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold flex items-center gap-2">
                  Litecoin
                  <span className="text-xs text-muted-foreground font-normal">(LTC)</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Send {price.ltc} LTC to the address below
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-yellow-500 transition-colors" />
            </button>
          </div>
        )}

        {step === "details" && paymentMethod && (
          <div className="space-y-4">
            {userEmail && (
              <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Paying as</div>
                  <div className="text-sm font-medium">{userEmail}</div>
                </div>
              </div>
            )}
            {paymentMethod === "paypal" && (
              <div className="rounded-lg bg-[#0070ba]/10 border border-[#0070ba]/20 p-4">
                <div className="text-sm font-medium mb-2">PayPal Friends & Family</div>
                <div className="text-sm text-muted-foreground mb-3">
                  Send <span className="text-white font-bold">${price.usd}</span> to:
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/30 rounded px-3 py-2 text-sm font-mono text-blue-300">
                    paypal.me/therealxyra
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText("paypal.me/therealxyra")}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Make sure to send as <span className="text-white">Friends & Family</span> to avoid fees.
                </div>
              </div>
            )}

            {paymentMethod === "crypto" && (
              <div className="rounded-lg bg-[#bfbbbb]/10 border border-[#bfbbbb]/20 p-4">
                <div className="text-sm font-medium mb-2">Litecoin (LTC)</div>
                <div className="text-sm text-muted-foreground mb-3">
                  Send <span className="text-white font-bold">{price.ltc} LTC</span> to:
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/30 rounded px-3 py-2 text-sm font-mono text-yellow-300 break-all">
                    LVqWz48gvDtJ1bDEsCykUjGsEE5m1ERViJ
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText("LVqWz48gvDtJ1bDEsCykUjGsEE5m1ERViJ")}
                    className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors shrink-0"
                  >
                    Copy
                  </button>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Send the exact amount. Your transaction will be verified automatically.
                </div>
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
              <button
                onClick={() => setStep("method")}
                className="flex-1 h-10 rounded-lg border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep("submit")}
                className="flex-1 h-10 rounded-lg gradient-accent text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === "submit" && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Upload a screenshot of your payment confirmation.
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Proof</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="proof-upload"
                />
                <label
                  htmlFor="proof-upload"
                  className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-white/10 bg-white/3 cursor-pointer hover:bg-white/5 hover:border-primary/30 transition-all"
                >
                  {proofFile ? (
                    <div className="text-center">
                      <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-sm font-medium">{proofFile.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(proofFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <div className="text-sm text-muted-foreground">
                        Click to upload screenshot
                      </div>
                      <div className="text-xs text-muted-foreground/60">
                        PNG, JPG up to 5MB
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep("details")}
                className="flex-1 h-10 rounded-lg border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !proofFile}
                className="flex-1 h-10 rounded-lg gradient-accent text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Payment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
