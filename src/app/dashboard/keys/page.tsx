"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Key,
  Search,
  Filter,
  Copy,
  Trash2,
  Check,
  Ban,
} from "lucide-react";
import type { UserKey, Script } from "@/types";

export default function KeysPage() {
  const [keys, setKeys] = useState<UserKey[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateCount, setGenerateCount] = useState(1);
  const [generateExpiry, setGenerateExpiry] = useState("never");
  const [selectedScript, setSelectedScript] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const [keysRes, scriptsRes] = await Promise.all([
      supabase
        .from("keys")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("scripts")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setKeys(keysRes.data ?? []);
    setScripts(scriptsRes.data ?? []);
    if (scriptsRes.data && scriptsRes.data.length > 0) {
      setSelectedScript(scriptsRes.data[0].id);
    }
    setLoading(false);
  }

  function generateRandomKey() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async function generateKeys() {
    if (!selectedScript) return;
    const supabase = createClient();
    if (!supabase) return;

    setGenerating(true);

    // Look up the script's project_id so RLS allows the insert
    const { data: script } = await supabase
      .from("scripts")
      .select("project_id")
      .eq("id", selectedScript)
      .single();
    if (!script) { setGenerating(false); return; }

    const keysToInsert = Array.from({ length: generateCount }, () => ({
      project_id: script.project_id,
      script_id: selectedScript,
      user_key: generateRandomKey(),
      auth_expire:
        generateExpiry === "never"
          ? -1
          : Math.floor(Date.now() / 1000) +
            parseInt(generateExpiry) * 86400,
      key_days:
        generateExpiry === "never" ? null : parseInt(generateExpiry),
    }));

    const { error } = await supabase.from("keys").insert(keysToInsert);

    if (!error) {
      setShowGenerateModal(false);
      setGenerateCount(1);
      fetchData();
    }
    setGenerating(false);
  }

  async function deleteKey(id: string) {
    if (!confirm("Delete this key? This action cannot be undone.")) return;
    const supabase = createClient();
    if (!supabase) return;

    await supabase.from("keys").delete().eq("id", id);
    fetchData();
  }

  async function banKey(id: string) {
    const supabase = createClient();
    if (!supabase) return;

    await supabase
      .from("keys")
      .update({ banned: true, ban_reason: "Banned by owner" })
      .eq("id", id);
    fetchData();
  }

  function handleCopyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function getStatusBadge(key: UserKey) {
    if (key.banned) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
          Banned
        </span>
      );
    }
    if (key.identifier) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
        Unassigned
      </span>
    );
  }

  const filteredKeys = keys.filter(
    (key) =>
      key.user_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.identifier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.discord_id?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keys</h1>
          <p className="text-muted-foreground">
            Generate and manage license keys for your scripts.
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors gap-2"
        >
          <Plus className="h-4 w-4" />
          Generate Keys
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Key
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">
                    HWID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                    Discord
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                    Executions
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
                          {key.user_key}
                        </code>
                        <button
                          onClick={() => handleCopyKey(key.user_key)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          {copiedKey === key.user_key ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(key)}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground truncate block max-w-[120px]">
                        {key.identifier || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {key.discord_id || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-sm">{key.total_executions}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!key.banned && (
                          <button
                            onClick={() => banKey(key.id)}
                            className="p-2 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                            title="Ban key"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteKey(key.id)}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredKeys.length === 0 && !loading && (
          <div className="py-12 text-center">
            <Key className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {keys.length === 0
                ? "No keys yet. Generate some keys to get started."
                : "No keys match your search."}
            </p>
          </div>
        )}
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border/50 bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Generate Keys</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Script</label>
                <select
                  value={selectedScript}
                  onChange={(e) => setSelectedScript(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {scripts.length === 0 && (
                    <option value="">No scripts available</option>
                  )}
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {scripts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Create a script first before generating keys.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Keys</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry</label>
                <select
                  value={generateExpiry}
                  onChange={(e) => setGenerateExpiry(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="never">Never</option>
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateKeys}
                  disabled={generating || !selectedScript || scripts.length === 0}
                  className="flex-1 h-10 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
