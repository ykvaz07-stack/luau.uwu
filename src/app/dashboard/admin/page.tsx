"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { MotionDiv } from "@/components/motion";
import { CodeEditor } from "@/components/ui/code-editor";

type AdminTab = "overview" | "users" | "payments" | "keys" | "announcements";

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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [keys, setKeys] = useState<{ id: string; user_key: string; banned: boolean; project_id: string; projects?: { name: string } }[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
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
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        if (adminEmail && user.email === adminEmail) {
          setIsAdmin(true);
          fetchAdminData();
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
    const supabase = createClient();
    if (!supabase) { setLoading(false); setChecking(false); return; }

    const [scriptsRes, keysRes, purchasesRes, subsRes, announcementsRes] = await Promise.all([
      supabase.from("scripts").select("id, name, content, project_id, version, obfuscation_level, projects(name)"),
      supabase.from("keys").select("id, user_key, banned, project_id, projects(name)"),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("plan, status"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    ]);

    const totalKeys = keysRes.count ?? 0;
    const activeKeys = keysRes.data?.filter((k: { banned: boolean }) => !k.banned).length ?? 0;
    const pendingPurchases = purchasesRes.data?.filter((p: { status: string }) => p.status === "pending") ?? [];
    const totalRevenue = purchasesRes.data?.filter((p: { status: string }) => p.status === "approved").reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) ?? 0;
    const activeSubs = subsRes.data?.filter((s: { status: string }) => s.status === "active").length ?? 0;

    // Fetch user emails for purchases
    let purchaseEmailMap = new Map<string, string>();
    if (purchasesRes.data && purchasesRes.data.length > 0) {
      const userIds = [...new Set(purchasesRes.data.map((p: { user_id: string }) => p.user_id))];
      try {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        if (authUsers?.users) {
          authUsers.users.forEach((u: { id: string; email?: string }) => {
            if (u.email) purchaseEmailMap.set(u.id, u.email);
          });
        }
      } catch (e) {
        console.error("Could not list auth users:", e);
      }
    }

    const purchasesWithEmail = (purchasesRes.data ?? []).map((p: PurchaseData) => ({
      ...p,
      user_email: purchaseEmailMap.get(p.user_id) || "Unknown",
    }));

    setStats({
      totalUsers: purchaseEmailMap.size || 0,
      totalScripts: scriptsRes.count ?? 0,
      totalKeys,
      activeKeys,
      totalRevenue,
      pendingPayments: pendingPurchases.length,
      activeSubscriptions: activeSubs,
    });
    setPurchases(purchasesWithEmail);
    setKeys(keysRes.data ?? []);
    setAnnouncements((announcementsRes.data ?? []) as AnnouncementData[]);
    setLoading(false);
    setChecking(false);
  }

  const loadUsers = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    const subsRes = await supabase.from("subscriptions").select("user_id, plan");
    const scriptsRes = await supabase.from("scripts").select("project_id, projects(user_id)");
    const keysRes = await supabase.from("keys").select("id, projects(user_id)");

    const subMap = new Map((subsRes.data ?? []).map((s: { user_id: string; plan: string }) => [s.user_id, s.plan]));
    const scriptCountMap = new Map<string, number>();
    const keyCountMap = new Map<string, number>();

    (scriptsRes.data ?? []).forEach((s: { projects?: { user_id: string } }) => {
      const uid = s.projects?.user_id;
      if (uid) scriptCountMap.set(uid, (scriptCountMap.get(uid) || 0) + 1);
    });
    (keysRes.data ?? []).forEach((k: { projects?: { user_id: string } }) => {
      const uid = k.projects?.user_id;
      if (uid) keyCountMap.set(uid, (keyCountMap.get(uid) || 0) + 1);
    });

    const mapped: UserData[] = (authUsers ?? []).map((u: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }) => ({
      id: u.id,
      email: u.email ?? "unknown",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      plan: subMap.get(u.id) || "free",
      scriptCount: scriptCountMap.get(u.id) || 0,
      keyCount: keyCountMap.get(u.id) || 0,
    }));

    setUsers(mapped);
  }, []);

  async function loadUserScripts(userId: string) {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("scripts")
      .select("id, name, content, project_id, version, obfuscation_level, projects(name, user_id)")
      .eq("projects.user_id", userId);
    setUserScripts((data as ScriptData[]) ?? []);
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
    fetchAdminData();
  }

  async function rejectPurchase(id: string) {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("purchases").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("audit_logs").insert({ admin_id: (await supabase.auth.getUser()).data.user?.id, action: "reject_purchase", target_type: "purchase", target_id: id });
    fetchAdminData();
  }

  const tabs: { id: AdminTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "payments", label: "Payments", icon: CreditCard, badge: stats?.pendingPayments },
    { id: "keys", label: "Keys", icon: Key },
    { id: "announcements", label: "Announcements", icon: Bell },
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
              if (tab.id === "users") loadUsers();
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Scripts", value: stats?.totalScripts ?? 0, icon: FileCode },
              { label: "Active Keys", value: stats?.activeKeys ?? 0, icon: Key },
              { label: "Revenue", value: `$${stats?.totalRevenue ?? 0}`, icon: CreditCard },
              { label: "Subscriptions", value: stats?.activeSubscriptions ?? 0, icon: Users },
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
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          loadUserScripts(user.id);
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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
                  <td className="py-3 px-4">
                    {k.banned ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">Banned</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
