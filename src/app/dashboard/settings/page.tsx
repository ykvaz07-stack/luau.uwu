"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Shield, Key, Bell, Copy, Check, Eye, EyeOff, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("ss_live_" + "aB3dE5gH7jK9mN1pQ3rS5tU7vW");
  const [notifications, setNotifications] = useState({ email: true, keyAlerts: false });

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? "");
      }
      setLoading(false);
    }

    fetchUser();
  }, []);

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedApiKey(true);
    setTimeout(() => setCopiedApiKey(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and API settings.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={loading ? "Loading..." : email}
              readOnly
              className="flex h-10 w-full rounded-lg border border-input bg-muted px-4 py-2 text-sm cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Plan</label>
            <div className="flex items-center gap-3">
              <div className="flex h-10 items-center rounded-lg border border-border px-4">
                <span className="text-sm font-medium">Free</span>
              </div>
              <Link
                href="/dashboard/billing"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors gap-2"
              >
                Upgrade Plan
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">API Key</h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use this API key to validate keys from your Roblox game. Keep it
            secret and never expose it in client-side code.
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                readOnly
                className="flex h-10 w-full rounded-lg border border-input bg-muted pl-4 pr-20 py-2 text-sm font-mono"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={handleCopyApiKey}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedApiKey ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("Regenerate your API key? This will invalidate the current key.")) {
                  const newKey = "ss_live_" + Array.from({ length: 20 }, () =>
                    "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36))
                  ).join("");
                  setApiKey(newKey);
                }
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted transition-colors text-destructive hover:text-destructive"
            >
              Regenerate
            </button>
          </div>
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
            <p className="text-sm text-yellow-500">
              <strong>Warning:</strong> Regenerating your API key will invalidate
              the current key. Update all scripts that use this key.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Security</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <div className="font-medium text-sm">Change Password</div>
              <div className="text-xs text-muted-foreground">
                Update your account password
              </div>
            </div>
            <button
              onClick={async () => {
                const newPassword = prompt("Enter new password (min 6 characters):");
                if (!newPassword || newPassword.length < 6) return;
                const supabase = createClient();
                if (!supabase) return;
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) {
                  alert("Failed: " + error.message);
                } else {
                  alert("Password updated successfully!");
                }
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Email notifications</div>
              <div className="text-xs text-muted-foreground">
                Receive updates about your account
              </div>
            </div>
            <button
              onClick={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.email ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${notifications.email ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Key usage alerts</div>
              <div className="text-xs text-muted-foreground">
                Get notified when keys are used
              </div>
            </div>
            <button
              onClick={() => setNotifications(prev => ({ ...prev, keyAlerts: !prev.keyAlerts }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.keyAlerts ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${notifications.keyAlerts ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
