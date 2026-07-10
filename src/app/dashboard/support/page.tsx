"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare,
  Plus,
  Send,
  X,
  Loader2,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  User,
  Shield,
} from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  users?: { email: string };
}

interface Message {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    fetchTickets();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedTicket) {
      pollRef.current = setInterval(() => fetchMessages(selectedTicket.id), 5000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [selectedTicket]);

  async function fetchTickets() {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .order("updated_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  }

  async function fetchMessages(ticketId: string) {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }

  function openTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  }

  async function sendReply() {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      setReplyText("");
      await fetchMessages(selectedTicket.id);
      fetchTickets();
    } catch {}
    setSending(false);
  }

  async function createTicket() {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newSubject.trim(), message: newMessage.trim(), priority: newPriority }),
      });
      setNewSubject("");
      setNewMessage("");
      setNewPriority("normal");
      setShowCreate(false);
      await fetchTickets();
    } catch {}
    setCreating(false);
  }

  async function closeTicket(id: string) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    fetchTickets();
    if (selectedTicket?.id === id) setSelectedTicket(null);
  }

  const statusColors: Record<string, string> = {
    open: "bg-green-500/15 text-green-500",
    closed: "bg-white/5 text-muted-foreground",
    resolved: "bg-blue-500/15 text-blue-500",
  };
  const priorityIcons: Record<string, React.ElementType> = {
    low: Info, normal: Clock, high: AlertTriangle, urgent: AlertTriangle,
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Ticket list */}
      <div className={`${selectedTicket ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 shrink-0 rounded-xl glass overflow-hidden`}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Tickets
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tickets yet</p>
              <button onClick={() => setShowCreate(true)} className="mt-2 text-xs text-primary hover:underline">Create one</button>
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                  selectedTicket?.id === t.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate max-w-[180px]">{t.subject}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[t.status] || ""}`}>{t.status}</span>
                </div>
                <div className="text-xs text-muted-foreground/60">
                  {new Date(t.created_at).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Ticket detail */}
      {selectedTicket ? (
        <div className="flex-1 flex flex-col rounded-xl glass overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedTicket(null)} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
              <div>
                <h3 className="font-semibold text-sm">{selectedTicket.subject}</h3>
                <span className="text-xs text-muted-foreground">{selectedTicket.users?.email ?? ""}</span>
              </div>
            </div>
            <button
              onClick={() => closeTicket(selectedTicket.id)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" /> Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isMe = msg.user_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                    msg.is_admin
                      ? "bg-primary/15 border border-primary/20"
                      : isMe
                        ? "bg-white/8 border border-white/10"
                        : "bg-white/5 border border-white/5"
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.is_admin ? (
                        <Shield className="h-3 w-3 text-primary" />
                      ) : (
                        <User className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {msg.is_admin ? "Admin" : "You"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-white/5 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                className="flex-1 h-10 rounded-lg glass-input px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={sendReply}
                disabled={sending || !replyText.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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

      {/* Create ticket modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg glass-modal rounded-xl p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">New Ticket</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <input
                  type="text"
                  placeholder="Brief description of your issue"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="flex h-10 w-full rounded-lg glass-input px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="flex h-10 w-full rounded-lg glass-input px-4 py-2 text-sm focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                <textarea
                  placeholder="Describe your issue in detail..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={5}
                  className="flex w-full rounded-lg glass-input px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none resize-none"
                />
              </div>
              <button
                onClick={createTicket}
                disabled={creating || !newSubject.trim() || !newMessage.trim()}
                className="w-full h-10 rounded-lg gradient-accent text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
