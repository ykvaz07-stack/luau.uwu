"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  FileCode,
  Copy,
  Check,
  Trash2,
  Shield,
  ShieldCheck,
  Loader2,
  Pencil,
  X,
  Key,
  Unlock,
  FileUp,
} from "lucide-react";
import type { Script, Project } from "@/types";
import { CodeEditor } from "@/components/ui/code-editor";

interface ScriptWithMeta extends Script {
  projects?: { name: string };
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptWithMeta[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<ScriptWithMeta | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadProject, setUploadProject] = useState("");
  const [uploadObfuscate, setUploadObfuscate] = useState(true);
  const [uploadRequiresKey, setUploadRequiresKey] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [obfuscatingId, setObfuscatingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editObfuscate, setEditObfuscate] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const [scriptsRes, projectsRes] = await Promise.all([
      supabase
        .from("scripts")
        .select("*, projects(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    setScripts(scriptsRes.data ?? []);
    setProjects(projectsRes.data ?? []);
    if (projectsRes.data && projectsRes.data.length > 0 && !uploadProject) {
      setUploadProject(projectsRes.data[0].id);
    }
    setLoading(false);
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (isEdit) {
        setEditContent(content);
      } else {
        setUploadContent(content);
        if (!uploadName) {
          setUploadName(file.name.replace(/\.(lua|luau)$/i, ""));
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [uploadName]);

  async function uploadScript() {
    if (!uploadName.trim() || !uploadContent.trim() || !uploadProject) return;
    setUploading(true);

    const res = await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: uploadName.trim(),
        content: uploadContent.trim(),
        project_id: uploadProject,
        requires_key: uploadRequiresKey,
        obfuscate: uploadObfuscate,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.script && uploadObfuscate) {
        await obfuscateScript(data.script.id);
      }
      setUploadName("");
      setUploadContent("");
      setUploadObfuscate(true);
      setUploadRequiresKey(false);
      setShowUploadModal(false);
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to upload script");
    }
    setUploading(false);
  }

  function openEditModal(script: ScriptWithMeta) {
    setShowEditModal(script);
    setEditContent(script.content);
    setEditObfuscate(true);
  }

  async function saveEdit() {
    if (!showEditModal || !editContent.trim()) return;
    const supabase = createClient();
    if (!supabase) return;

    setSaving(true);

    const { error } = await supabase
      .from("scripts")
      .update({
        content: editContent.trim(),
        version: showEditModal.version + 1,
        obfuscation_level: editObfuscate ? "pending" : "none",
        obfuscated_content: null,
      })
      .eq("id", showEditModal.id);

    if (!error && editObfuscate) {
      await obfuscateScript(showEditModal.id);
    }

    setShowEditModal(null);
    setSaving(false);
    fetchData();
  }

  async function obfuscateScript(scriptId: string) {
    setObfuscatingId(scriptId);

    try {
      const response = await fetch("/api/obfuscate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script_id: scriptId,
          options: {
            vmType: "register",
            vmLevel: "maximum",
            encodeStrings: true,
            scramble: true,
          },
        }),
      });

      const data = await response.json();
      if (!data.success) {
        console.error("Obfuscation failed:", data.error);
        const supabase = createClient();
        if (supabase) {
          await supabase
            .from("scripts")
            .update({ obfuscation_level: "none" })
            .eq("id", scriptId);
        }
      }
    } catch (err) {
      console.error("Obfuscation error:", err);
      const supabase = createClient();
      if (supabase) {
        await supabase
          .from("scripts")
          .update({ obfuscation_level: "none" })
          .eq("id", scriptId);
      }
    }

    setObfuscatingId(null);
    fetchData();
  }

  async function deleteScript(id: string) {
    if (!confirm("Delete this script? This action cannot be undone.")) return;
    const supabase = createClient();
    if (!supabase) return;

    await supabase.from("scripts").delete().eq("id", id);
    fetchData();
  }

  function handleCopyLoadstring(script: ScriptWithMeta) {
    const base = window.location.origin;
    if (script.requires_key) {
      navigator.clipboard.writeText(
        `loadstring(game:HttpGet("${base}/api/scripts/${script.id}/loader?key=YOUR_KEY"))()`
      );
    } else {
      navigator.clipboard.writeText(
        `loadstring(game:HttpGet("${base}/api/scripts/${script.id}/load"))()`
      );
    }
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getObfuscationBadge(level?: string) {
    if (!level || level === "none") {
      return null;
    }
    if (level === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Protecting
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
        <ShieldCheck className="h-3 w-3" />
        VM Protected
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scripts</h1>
          <p className="text-muted-foreground">
            Manage, protect, and version your Luau scripts.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity gap-2"
        >
          <Plus className="h-4 w-4" />
          New Script
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card p-4 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted" />
                <div className="flex-1">
                  <div className="h-5 w-32 bg-muted rounded mb-2" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <FileCode className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No scripts yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Upload your first script to get started.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex h-10 items-center justify-center rounded-lg gradient-accent px-4 text-sm font-medium text-white hover:opacity-90 transition-opacity gap-2"
          >
            <Plus className="h-4 w-4" />
            New Script
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => {
            const projectName = script.projects?.name ?? "Unknown";
            const isObfuscating = obfuscatingId === script.id;
            return (
              <div
                key={script.id}
                className="group rounded-xl border border-border/50 bg-card p-4 hover:border-primary/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <FileCode className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{script.name}</h3>
                        {getObfuscationBadge(script.obfuscation_level)}
                        {script.requires_key ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
                            <Key className="h-3 w-3" />
                            Key Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                            <Unlock className="h-3 w-3" />
                            Free
                          </span>
                        )}
                        {script.ffa && (
                          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                            FFA
                          </span>
                        )}
                        {script.silent && (
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
                            Silent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span>{projectName}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">v{script.version}</span>
                        <span>
                          {new Date(script.created_at).toLocaleDateString()}
                        </span>
                        {script.file_name && (
                          <span className="text-xs text-muted-foreground/60">
                            {script.file_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(!script.obfuscation_level || script.obfuscation_level === "none" || script.obfuscation_level === "pending") && (
                      <button
                        onClick={() => obfuscateScript(script.id)}
                        disabled={isObfuscating}
                        title="Protect script with VM obfuscation"
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors gap-1.5 disabled:opacity-50 px-2.5"
                      >
                        {isObfuscating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                          {isObfuscating ? "Protecting..." : "Protect"}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(script)}
                      title="Edit source code"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleCopyLoadstring(script)}
                      title="Copy loadstring"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors gap-1.5 px-2.5"
                    >
                      {copiedId === script.id ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="hidden sm:inline">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span className="hidden sm:inline">Copy Load</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deleteScript(script.id)}
                      title="Delete script"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-muted/30 border border-border/30 px-3 py-2 font-mono text-xs text-muted-foreground/70 overflow-x-auto max-h-10 line-clamp-2 select-all">
                  {script.content.substring(0, 150)}{script.content.length > 150 ? "..." : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/50 bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Script</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>
                  <select
                    value={uploadProject}
                    onChange={(e) => setUploadProject(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {projects.length === 0 && (
                      <option value="">No projects available</option>
                    )}
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Script Name</label>
                  <input
                    type="text"
                    placeholder="My Awesome Script"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Script Content</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    Upload .lua file
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".lua,.luau,.txt"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e)}
                  />
                </div>
                <CodeEditor
                  value={uploadContent}
                  onChange={setUploadContent}
                  height="300px"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                  <button
                    type="button"
                    onClick={() => setUploadObfuscate(!uploadObfuscate)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      uploadObfuscate ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        uploadObfuscate ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">VM Obfuscation</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Register VM + encryption
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                  <button
                    type="button"
                    onClick={() => setUploadRequiresKey(!uploadRequiresKey)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      uploadRequiresKey ? "bg-orange-500" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        uploadRequiresKey ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-sm font-medium">Require Key</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Users need a key to use
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadScript}
                  disabled={
                    uploading ||
                    !uploadName.trim() ||
                    !uploadContent.trim() ||
                    !uploadProject ||
                    projects.length === 0
                  }
                  className="flex-1 h-10 rounded-lg gradient-accent text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {uploading
                    ? uploadObfuscate
                      ? "Uploading & Protecting..."
                      : "Uploading..."
                    : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/50 bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Edit: {showEditModal.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Version {showEditModal.version} &rarr; {showEditModal.version + 1}
                </p>
              </div>
              <button onClick={() => setShowEditModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Source Code</label>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    Upload .lua file
                  </button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept=".lua,.luau,.txt"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, true)}
                  />
                </div>
                <CodeEditor
                  value={editContent}
                  onChange={setEditContent}
                  height="400px"
                />
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                <button
                  type="button"
                  onClick={() => setEditObfuscate(!editObfuscate)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    editObfuscate ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editObfuscate ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium">Re-obfuscate after save</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Old obfuscated version is replaced with the new one
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowEditModal(null)}
                  className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving || !editContent.trim()}
                  className="flex-1 h-10 rounded-lg gradient-accent text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Saving & Protecting..." : "Save & Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
