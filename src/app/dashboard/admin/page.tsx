"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Shield,
  Users,
  Key,
  FileCode,
  BarChart3,
  CreditCard,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Clock,
  Eye,
  Ban,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Bell,
  MessageSquare,
  Send,
  User,
  Globe,
  RefreshCw,
} from "lucide-react";
import { MotionDiv } from "@/components/motion";
import { CodeEditor } from "@/components/ui/code-editor";
import { isAdminEmail } from "@/lib/admin-check";

type AdminTab = "overview" | "users" | "payments" | "keys" | "announcements" | "tickets" | "osint";

interface AdminStats {
  totalUsers: number;
  totalScripts: number;
  totalKeys: number;
  activeKeys: number;
  totalRevenue: number;
  pendingPayments: number;
  activeSubscriptions: number;
}

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  plan?: string;
  scriptCount?: number;
  keyCount?: number;
}

interface PurchaseData {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  payment_method: string;
  proof_url: string | null;
  status: string;
  created_at: string;
  user_email?: string;
}

interface ScriptData {
  id: string;
  name: string;
  content: string;
  project_id: string;
  version: number;
  obfuscation_level?: string;
  projects?: { name: string };
}

interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  type: string;
  active: boolean;
  created_at: string;
}

interface TicketData {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  users?: { email: string };
}

interface TicketMessageData {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [keys, setKeys] = useState<{ id: string; user_key: string; banned: boolean; project_id: string; identifier?: string; projects?: { name: string } }[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [allTickets, setAllTickets] = useState<TicketData[]>([]);
  const [selectedAdminTicket, setSelectedAdminTicket] = useState<TicketData | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessageData[]>([]);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [sendingAdminReply, setSendingAdminReply] = useState(false);
  const [osintData, setOsintData] = useState<{ logs: Record<string, unknown>[]; stats: Record<string, number> } | null>(null);
  const [osintSearch, setOsintSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userScripts, setUserScripts] = useState<ScriptData[]>([]);
  const [viewingScript, setViewingScript] = useState<ScriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      if (!supabase) { setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (isAdminEmail(user.email)) {
          setIsAdmin(true);
          await fetchAdminData();
        } else {
          setChecking(false);
        }
      } else {
        setChecking(false);
      }
    }
    checkAdmin();
  }, []);

  async function fetchAdminData() {
    try {
      const res = await fetch("/api/admin/stats");
      const json = await res.json();
      setStats(json.stats);
      setKeys(json.keys ?? []);
      setPurchases(json.purchasesWithEmail ?? []);
      setAnnouncements((json.announcements ?? []) as AnnouncementData[]);
      setUsers((json.authUsers ?? []) as UserData[]);
    } catch {
      setStats(null);
    }

    // Fetch tickets via API (bypasses RLS for admin)
    try {
      const ticketsRes = await fetch("/api/tickets");
      const ticketsJson = await ticketsRes.json();
      setAllTickets(ticketsJson.tickets ?? []);
    } catch {
      setAllTickets([]);
    }

    setLoading(false);
    setChecking(false);
  }

  async function loadUserScripts(userId: string) {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("scripts")
      .select("id, name, content, project_id, version, obfuscation_level, projects(name, user_id)")
      .eq("projects.user_id", userId);
    setUserScripts((data as ScriptData[]) ?? []);
  }

  async function openAdminTicket(ticket: TicketData) {
    setSelectedAdminTicket(ticket);
    try {
      const res = await fetch(`/api/tickets?id=${ticket.id}`);
      const json = await res.json();
      setTicketMessages(json.messages ?? []);
    } catch {
      setTicketMessages([]);
    }
  }

  async function sendAdminReply() {
    if (!adminReplyText.trim() || !selectedAdminTicket) return;
    setSendingAdminReply(true);
    try {
      await fetch(`/api/tickets/${selectedAdminTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: adminReplyText.trim() }),
      });
      setAdminReplyText("");
      const refreshRes = await fetch(`/api/tickets?id=${selectedAdminTicket.id}`);
      const refreshJson = await refreshRes.json();
      setTicketMessages(refreshJson.messages ?? []);
      await fetchAdminData();
    } catch {}
    setSendingAdminReply(false);
  }

  async function closeAdminTicket(id: string) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setSelectedAdminTicket(null);
    await fetchAdminData();
  }

  async function fetchOsint() {
    try {
      const res = await fetch("/api/admin/osint");
      if (!res.ok) { setOsintData({ logs: [], stats: { totalUsers: 0, uniqueIps: 0, totalSignups: 0, totalScriptLoads: 0, totalLogEntries: 0 } }); return; }
      const json = await res.json();
      if (json.error) { setOsintData({ logs: [], stats: { totalUsers: 0, uniqueIps: 0, totalSignups: 0, totalScriptLoads: 0, totalLogEntries: 0 } }); return; }
      setOsintData(json);
    } catch { setOsintData({ logs: [], stats: { totalUsers: 0, uniqueIps: 0, totalSignups: 0, totalScriptLoads: 0, totalLogEntries: 0 } }); }
  }

  async function approvePurchase(id: string, plan: string, userId: string) {
    const supabase = createClient();
    if (!supabase) return;

    await supabase.from("purchases").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", id);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const existing = await supabase.from("subscriptions").select("id").eq("user_id", userId).single();
    if (existing.data) {
      await supabase.from("subscriptions").update({ plan, status: "active", expires_at: expiresAt.toISOString() }).eq("user_id", userId);
    } else {
      await supabase.from("subscriptions").insert({ user_id: userId, plan, status: "active", expires_at: expiresAt.toISOString() });
    }

    await supabase.from("audit_logs").insert({ admin_id: (await supabase.auth.getUser()).data.user?.id, action: "approve_purchase", target_type: "purchase", target_id: id, details: { plan, user_id: userId } });
    await fetchAdminData();
  }

  async function rejectPurchase(id: string) {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("purchases").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("audit_logs").insert({ admin_id: (await supabase.auth.getUser()).data.user?.id, action: "reject_purchase", target_type: "purchase", target_id: id });
    await fetchAdminData();
  }

  const tabs: { id: AdminTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "tickets", label: "Tickets", icon: MessageSquare, badge: allTickets.filter((t) => t.status === "open").length },
    { id: "users", label: "Users", icon: Users },
    { id: "payments", label: "Payments", icon: CreditCard, badge: stats?.pendingPayments },
    { id: "keys", label: "Keys", icon: Key },
    { id: "announcements", label: "Announcements", icon: Bell },
    { id: "osint", label: "OSINT", icon: Eye },
  ];

  if (checking) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MotionDiv>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Admin Dashboard
        </h1>
      </MotionDiv>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/3 border border-white/5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "osint") { fetchOsint(); }
                if (tab.id !== "tickets") setSelectedAdminTicket(null);
              }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
                { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users },
                { label: "Scripts", value: stats?.totalScripts ?? 0, icon: FileCode },
                { label: "Active Keys", value: stats?.activeKeys ?? 0, icon: Key },
                { label: "Revenue", value: `$${stats?.totalRevenue ?? 0}`, icon: CreditCard },
                { label: "Pending Payments", value: stats?.pendingPayments ?? 0, icon: Clock },
                { label: "Subscriptions", value: stats?.activeSubscriptions ?? 0, icon: Shield },
              ].map((s) => (
              <div key={s.label} className="rounded-xl glass p-4">
                <s.icon className="h-6 w-6 text-primary mb-2" />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-lg glass-input pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="rounded-xl glass overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Plan</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Scripts</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Keys</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter((u) => u.email.toLowerCase().includes(searchQuery.toLowerCase())).map((user) => (
                  <tr key={user.id} className="border-b border-white/5 last:border-0 glass-table-row">
                    <td className="py-3 px-4 text-sm">{user.email}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${user.plan === "pro" ? "bg-primary/15 text-primary" : user.plan === "premium" ? "bg-yellow-500/15 text-yellow-500" : "bg-white/5 text-muted-foreground"}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm hidden md:table-cell">{user.scriptCount ?? 0}</td>
                    <td className="py-3 px-4 text-sm hidden md:table-cell">{user.keyCount ?? 0}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            loadUserScripts(user.id);
                          }}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            const plans = ["free", "pro", "premium"];
                            const current = user.plan || "free";
                            const nextPlan = plans[(plans.indexOf(current) + 1) % plans.length];
                            const supabase = createClient();
                            if (!supabase) return;
                            const existing = await supabase.from("subscriptions").select("id").eq("user_id", user.id).maybeSingle();
                            if (existing.data) {
                              await supabase.from("subscriptions").update({ plan: nextPlan }).eq("user_id", user.id);
                            } else {
                              await supabase.from("subscriptions").insert({ user_id: user.id, plan: nextPlan, status: "active" });
                            }
                            fetchAdminData();
                          }}
                          className="p-2 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                          title="Cycle plan (free→pro→premium)"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="space-y-4">
          {purchases.filter((p) => p.status === "pending").length === 0 ? (
            <div className="rounded-xl glass p-8 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No pending payments.</p>
            </div>
          ) : (
            purchases.filter((p) => p.status === "pending").map((purchase) => (
              <div key={purchase.id} className="rounded-xl glass p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium capitalize">{purchase.plan} — ${purchase.amount}</div>
                      <div className="text-xs text-muted-foreground">
                        {purchase.user_email || purchase.user_id} &middot;{" "}
                        {purchase.payment_method === "paypal" ? "PayPal F&F" : "Litecoin"} &middot;{" "}
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approvePurchase(purchase.id, purchase.plan, purchase.user_id)}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-green-500/15 text-green-500 text-sm font-medium px-3 hover:bg-green-500/25 transition-colors gap-1"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => rejectPurchase(purchase.id)}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-red-500/15 text-red-500 text-sm font-medium px-3 hover:bg-red-500/25 transition-colors gap-1"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
                {purchase.proof_url && (
                  <div className="rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={purchase.proof_url}
                      alt="Payment proof"
                      className="w-full max-h-64 object-contain bg-black/30"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const link = document.createElement("a");
                        link.href = purchase.proof_url!;
                        link.target = "_blank";
                        link.rel = "noopener noreferrer";
                        link.className = "inline-flex items-center gap-1 text-xs text-primary hover:underline p-3";
                        link.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> View Proof';
                        target.parentElement?.appendChild(link);
                      }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
          <h3 className="text-sm font-medium text-muted-foreground mt-6">History</h3>
          {purchases.filter((p) => p.status !== "pending").map((purchase) => (
            <div key={purchase.id} className="rounded-xl bg-white/3 border border-white/5 p-3 flex items-center justify-between">
              <div className="text-sm">
                <span className="capitalize">{purchase.plan}</span> — ${purchase.amount}
                <span className="text-muted-foreground ml-2">
                  {purchase.user_email || purchase.user_id} &middot; {new Date(purchase.created_at).toLocaleDateString()}
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${purchase.status === "approved" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                {purchase.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "keys" && (
        <div className="rounded-xl glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Key</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Project</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">HWID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-white/5 last:border-0 glass-table-row">
                  <td className="py-3 px-4">
                    <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded">{k.user_key.slice(0, 20)}...</code>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">{k.projects?.name ?? "—"}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[100px]">{k.identifier || "—"}</td>
                  <td className="py-3 px-4">
                    {k.banned ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">Banned</span>
                    ) : k.identifier ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Locked</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "tickets" && (
        <div className="flex gap-4 h-[calc(100vh-16rem)]">
          <div className="w-80 shrink-0 rounded-xl glass overflow-hidden flex flex-col">
            <div className="p-3 border-b border-white/5">
              <h3 className="text-sm font-semibold">All Tickets ({allTickets.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {allTickets.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No tickets yet.</div>
              ) : (
                allTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openAdminTicket(t)}
                    className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                      selectedAdminTicket?.id === t.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate max-w-[180px]">{t.subject}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        t.status === "open" ? "bg-green-500/15 text-green-500" :
                        t.status === "closed" ? "bg-white/5 text-muted-foreground" :
                        "bg-blue-500/15 text-blue-500"
                      }`}>{t.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground/60">
                      {t.users?.email ?? "—"} &middot; {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          {selectedAdminTicket ? (
            <div className="flex-1 flex flex-col rounded-xl glass overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div>
                  <h3 className="font-semibold text-sm">{selectedAdminTicket.subject}</h3>
                  <span className="text-xs text-muted-foreground">{selectedAdminTicket.users?.email ?? ""}</span>
                </div>
                <button
                  onClick={() => closeAdminTicket(selectedAdminTicket.id)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" /> Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {ticketMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                      msg.is_admin
                        ? "bg-primary/15 border border-primary/20"
                        : "bg-white/8 border border-white/10"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {msg.is_admin ? (
                          <Shield className="h-3 w-3 text-primary" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {msg.is_admin ? "Admin" : selectedAdminTicket.users?.email ?? "User"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a reply..."
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAdminReply(); } }}
                    className="flex-1 h-10 rounded-lg glass-input px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button
                    onClick={sendAdminReply}
                    disabled={sendingAdminReply || !adminReplyText.trim()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {sendingAdminReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center rounded-xl glass">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Select a ticket to view</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "osint" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">IP Intelligence</h2>
            <button
              onClick={fetchOsint}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          {!osintData ? (
            <div className="rounded-xl glass p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: osintData.stats.totalUsers },
                  { label: "Unique IPs", value: osintData.stats.uniqueIps },
                  { label: "Signups", value: osintData.stats.totalSignups },
                  { label: "Script Loads", value: osintData.stats.totalScriptLoads },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl glass p-3">
                    <div className="text-lg font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by IP, email, or user agent..."
                  value={osintSearch}
                  onChange={(e) => setOsintSearch(e.target.value)}
                  className="flex h-10 w-full rounded-lg glass-input pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <div className="rounded-xl glass overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 sticky top-0 bg-card">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Time</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">IP</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Country</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Action</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">UA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(osintData.logs as Record<string, unknown>[])
                        .filter((log) => {
                          const q = osintSearch.toLowerCase();
                          return !q || String(log.ip_address).includes(q) || String(log.user_email ?? "").includes(q) || String(log.user_agent ?? "").includes(q);
                        })
                        .slice(0, 200)
                        .map((log, i) => (
                          <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                            <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.created_at as string).toLocaleString()}
                            </td>
                            <td className="py-2 px-3">
                              <code className="text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">{String(log.ip_address)}</code>
                            </td>
                            <td className="py-2 px-3 text-xs whitespace-nowrap" title={String(log.country ?? "Unknown")}>
                              {String(log.country_flag ?? "🏳️")} {String(log.country ?? "Unknown")}
                            </td>
                            <td className="py-2 px-3 text-xs text-muted-foreground">{String(log.user_email ?? "—")}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${log.action === "signup" ? "bg-green-500/10 text-green-500" : log.action === "start_trial" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}>
                                {String(log.action)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">
                              {String(log.user_agent ?? "—")}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "announcements" && (
        <div className="space-y-4">
          <div className="rounded-xl glass p-6">
            <h3 className="text-sm font-medium mb-3">Create Announcement</h3>
            <AnnouncementForm onCreated={fetchAdminData} />
          </div>
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl bg-white/3 border border-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{a.content}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.active ? "bg-green-500/10 text-green-500" : "bg-white/5 text-muted-foreground"}`}>
                  {a.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Detail Slide-over */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-lg glass-modal overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{selectedUser.email}</h2>
              <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/3 border border-white/5 p-3">
                  <div className="text-xs text-muted-foreground">Plan</div>
                  <div className="text-sm font-medium capitalize">{selectedUser.plan}</div>
                </div>
                <div className="rounded-lg bg-white/3 border border-white/5 p-3">
                  <div className="text-xs text-muted-foreground">Scripts</div>
                  <div className="text-sm font-medium">{userScripts.length}</div>
                </div>
              </div>
              <div className="rounded-lg bg-white/3 border border-white/5 p-3">
                <div className="text-xs text-muted-foreground">Joined</div>
                <div className="text-sm">{new Date(selectedUser.created_at).toLocaleDateString()}</div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Scripts</h3>
                {userScripts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No scripts.</p>
                ) : (
                  <div className="space-y-2">
                    {userScripts.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setViewingScript(s)}
                        className="rounded-lg bg-white/3 border border-white/5 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{s.name}</div>
                          <span className="text-xs text-muted-foreground">v{s.version}</span>
                        </div>
                        <div className="text-xs text-muted-foreground/60 mt-1 truncate">{s.content.slice(0, 80)}...</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Script Viewer Modal */}
      {viewingScript && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[85vh] glass-modal rounded-xl p-6 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{viewingScript.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {viewingScript.projects?.name} &middot; v{viewingScript.version}
                </p>
              </div>
              <button onClick={() => setViewingScript(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden rounded-lg">
              <CodeEditor value={viewingScript.content} readOnly height="500px" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) return;
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("announcements").insert({ title: title.trim(), content: content.trim(), type });
    setTitle("");
    setContent("");
    onCreated();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex h-10 w-full rounded-lg glass-input px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex h-10 w-full rounded-lg glass-input px-4 py-2 text-sm focus:outline-none"
        >
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <textarea
        placeholder="Announcement content..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="flex w-full rounded-lg glass-input px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none resize-none"
      />
      <button
        onClick={handleSubmit}
        disabled={!title.trim() || !content.trim()}
        className="inline-flex h-9 items-center justify-center rounded-lg gradient-accent px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        Create Announcement
      </button>
    </div>
  );
}
