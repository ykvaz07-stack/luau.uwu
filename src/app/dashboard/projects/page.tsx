"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, FolderKanban, ExternalLink, Trash2 } from "lucide-react";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    setProjects(data ?? []);
    setLoading(false);
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    setCreating(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim() }),
    });

    if (res.ok) {
      setNewProjectName("");
      setShowNewModal(false);
      fetchProjects();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create project");
    }
    setCreating(false);
  }

  async function deleteProject(id: string) {
    const supabase = createClient();
    if (!supabase) return;

    if (!confirm("Are you sure? This will delete all scripts and keys in this project.")) return;

    await supabase.from("projects").delete().eq("id", id);
    fetchProjects();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your script projects and their settings.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors gap-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card p-6 animate-pulse"
            >
              <div className="h-12 w-12 rounded-xl bg-muted mb-4" />
              <div className="h-5 w-32 bg-muted rounded mb-2" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first project to start managing scripts.
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group rounded-xl border border-border/50 bg-card p-6 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <FolderKanban className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {project.platform} · Created{" "}
                {new Date(project.created_at).toLocaleDateString()}
              </p>
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2">
                <button className="flex-1 inline-flex h-9 items-center justify-center rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border/50 bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Create Project</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="projectName" className="text-sm font-medium">
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  placeholder="My Awesome Script"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createProject()}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  disabled={creating || !newProjectName.trim()}
                  className="flex-1 h-10 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
