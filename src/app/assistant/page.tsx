"use client";

import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bot,
  User,
  Send,
  Sparkles,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Terminal,
  RotateCcw,
  MessageSquare,
  Plus,
  Trash2,
  Menu,
  X,
  History,
  Search,
  Pencil,
} from "lucide-react";
import FormattedChatMessage from "@/components/FormattedChatMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{
    name: string;
    args: any;
    result: any;
  }>;
  latencyMs?: number;
  timestamp: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: string;
}

interface SamplePrompt {
  label: string;
  prompt: string;
  isInvoice?: boolean;
}

const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    label: "📑 Export Today's Revenue (PDF/Excel)",
    prompt: "Make a pdf today Gross Captured Volume and settlement report",
  },
  {
    label: "📄 Create $50 Invoice for Acme",
    prompt: "Create a new invoice for $50 for Acme",
    isInvoice: true,
  },
  {
    label: "📄 Generate $150 Invoice for Chloe",
    prompt: "Generate a new invoice of $150 for Chloe Bennett due in 14 days",
    isInvoice: true,
  },
  {
    label: "📄 Bill $80 to Vanguard Logistics",
    prompt: "Create a new unpaid invoice of $80 for Vanguard Logistics for logistics audit",
    isInvoice: true,
  },
  {
    label: "📊 Financial Overview",
    prompt: "Analyze my business payments, identify unpaid invoices, and explain my financial performance.",
  },
  {
    label: "✉️ Overdue Reminders",
    prompt: "Find all overdue invoices and prepare reminders.",
  },
  {
    label: "🛡️ Check Fraud Alerts",
    prompt: "Check my active fraud alerts and transaction anomalies.",
  },
  {
    label: "🔍 Audit Refunds",
    prompt: "Audit my refund patterns and customer return rates.",
  },
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: `Hello! I am **PayPilot AI**, your autonomous financial operations agent integrated with your merchant ledger and the **PayPal Developer Platform**.\n\nI can execute genuine backend operations such as:\n- **Creating client invoices** in Smart Collections with 1-click PayPal payment links\n- Auditing transaction histories and revenue performance\n- Detecting unpaid invoices and staging personalized payment reminders\n- Analyzing refund eligibility and routing approvals\n\n💡 *Tip: Click one of the suggested chips below or type "Create an invoice for $50 for Acme" to create an invoice directly.*`,
  timestamp: "Ready",
};

export default function AssistantPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch conversations list
  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      const data = await res.json();
      if (data.conversations && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        return data.conversations;
      }
    } catch (err) {
      console.error("Failed to load AI conversations list:", err);
    }
    return [];
  };

  // 2. Select & load specific conversation messages
  const loadConversationMessages = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages([WELCOME_MESSAGE, ...data.messages]);
        setConversationId(id);
        if (typeof window !== "undefined") {
          localStorage.setItem("paypilot_conversation_id", id);
        }
      }
    } catch (err) {
      console.error(`Failed to load messages for conversation ${id}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Initial mount: load conversations and restore last active session
  useEffect(() => {
    const init = async () => {
      setLoadingHistory(true);
      const convList = await fetchConversations();
      
      let targetId: string | null = null;
      if (typeof window !== "undefined") {
        targetId = localStorage.getItem("paypilot_conversation_id");
      }

      // If saved targetId exists in convList, load it
      if (targetId && convList.some((c: any) => c.id === targetId)) {
        await loadConversationMessages(targetId);
      } else if (convList.length > 0) {
        // Load the most recent conversation by default
        await loadConversationMessages(convList[0].id);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
      setLoadingHistory(false);
    };

    init();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Start a fresh new session
  const handleStartNewChat = () => {
    setConversationId(undefined);
    setMessages([WELCOME_MESSAGE]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("paypilot_conversation_id");
    }
  };

  // Delete a specific conversation session
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation session?")) return;

    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (conversationId === id) {
          handleStartNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Send message
  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, conversationId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to contact AI agent");
      }

      const activeId = data.conversationId;
      if (activeId) {
        setConversationId(activeId);
        if (typeof window !== "undefined") {
          localStorage.setItem("paypilot_conversation_id", activeId);
        }
      }

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        toolCalls: data.toolCallsExecuted,
        latencyMs: data.latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      // Refresh left column conversations list
      fetchConversations();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `⚠️ Error executing financial operation: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Re-submit an edited user message and obtain fresh AI response
  const handleUpdateAndResubmit = async (msgId: string, updatedText: string) => {
    const trimmed = updatedText.trim();
    if (!trimmed || loading) return;

    const targetIdx = messages.findIndex((m) => m.id === msgId);
    if (targetIdx === -1) return;

    const previousMessages = messages.slice(0, targetIdx);
    const updatedUserMsg: Message = {
      ...messages[targetIdx],
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Replace the message and clear downstream stale messages
    setMessages([...previousMessages, updatedUserMsg]);
    setEditingMsgId(null);
    setEditText("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to contact AI agent");
      }

      const activeId = data.conversationId;
      if (activeId) {
        setConversationId(activeId);
        if (typeof window !== "undefined") {
          localStorage.setItem("paypilot_conversation_id", activeId);
        }
      }

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        toolCalls: data.toolCallsExecuted,
        latencyMs: data.latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      fetchConversations();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `⚠️ Error executing financial operation: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Only allow export toolbar when user asked for PDF/Excel/Report/Export
  const checkIfExportRequested = (idx: number) => {
    const prevMsg = idx > 0 ? messages[idx - 1] : null;
    if (!prevMsg || prevMsg.role !== "user") return false;
    const lower = prevMsg.content.toLowerCase();
    return (
      lower.includes("pdf") ||
      lower.includes("excel") ||
      lower.includes("xlsl") ||
      lower.includes("xlsx") ||
      lower.includes("sheet") ||
      lower.includes("csv") ||
      lower.includes("export") ||
      (lower.includes("report") &&
        (lower.includes("make") ||
          lower.includes("download") ||
          lower.includes("generate") ||
          lower.includes("get")))
    );
  };

  const activeConv = conversations.find((c) => c.id === conversationId);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8.5rem)] max-w-7xl mx-auto gap-4">
        {/* Left Column: Chat History Sidebar */}
        <div
          className={`${
            sidebarOpen ? "flex" : "hidden sm:flex sm:w-16"
          } flex-col w-72 shrink-0 rounded-2xl bg-surface-card border border-surface-border overflow-hidden transition-all duration-200`}
        >
          {/* Sidebar Top: New Chat Action */}
          <div className="p-3.5 border-b border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <History className="w-4 h-4 text-accent-cyan" />
                <span className={sidebarOpen ? "inline" : "hidden sm:hidden"}>Chat History</span>
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1 rounded-md text-slate-400 hover:text-white sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleStartNewChat}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className={sidebarOpen ? "inline" : "hidden sm:hidden"}>New Consultation</span>
            </button>

            {/* Quick Session Filter */}
            {sidebarOpen && (
              <div className="relative pt-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 translate-y-[-20%] text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter sessions..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#070B18] border border-surface-border text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-surface-border/20">
            {loadingHistory ? (
              <div className="p-4 text-center text-xs text-slate-500">Loading sessions...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                <MessageSquare className="w-6 h-6 mx-auto text-slate-600" />
                <p>No past chat sessions.</p>
                <p className="text-[11px] text-slate-600">Start asking questions to create your first session.</p>
              </div>
            ) : (
              conversations
                .filter((c) => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((c) => {
                const isActive = c.id === conversationId;
                const formattedTime = new Date(c.updatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const formattedDate = new Date(c.updatedAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={c.id}
                    onClick={() => loadConversationMessages(c.id)}
                    className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? "bg-primary/20 border-primary/50 text-white shadow-sm"
                        : "bg-[#090D1A]/50 border-transparent hover:bg-surface-border/40 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? "text-accent-cyan" : "text-slate-400 group-hover:text-slate-300"
                            }`}
                          />
                          <p className="text-xs font-semibold truncate leading-tight">{c.title}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                          <span>
                            {formattedDate}, {formattedTime}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-cyan-300">{c.messageCount} msgs</span>
                        </div>
                      </div>

                      {/* Delete Session Button (Hover only) */}
                      <button
                        onClick={(e) => handleDeleteConversation(c.id, e)}
                        title="Delete this chat session"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-surface-border text-[11px] text-slate-400 flex items-center justify-between">
            <span className="text-slate-500">{conversations.length} total sessions</span>
            <span className="font-mono text-cyan-400">NVIDIA NIM</span>
          </div>
        </div>

        {/* Right Area: Main Chat Window */}
        <div className="flex-1 flex flex-col rounded-2xl bg-surface-card border border-surface-border overflow-hidden">
          {/* Header Banner */}
          <div className="flex items-center justify-between p-4 border-b border-surface-border bg-[#0B1224]/80">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg bg-surface border border-surface-border text-slate-400 hover:text-white sm:hidden"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent-cyan flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>

              <div>
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  <span>AI Financial Operations Agent</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-indigo-300 font-mono">
                    NVIDIA NIM Active
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  {activeConv ? activeConv.title : "Connected to PayPal Orders v2, Captures & Ledger"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Human Approval Guard Enabled</span>
              </div>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-accent-cyan" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 space-y-3 ${
                    msg.role === "user"
                      ? "bg-primary text-white ml-12"
                      : "bg-[#090D1A] border border-surface-border text-slate-200"
                  }`}
                >
                  {/* Executed Tools Badge (For Assistant) */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="space-y-1.5 pb-2 border-b border-surface-border/50">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 tracking-wider">
                        <Terminal className="w-3 h-3 text-emerald-400" />
                        <span>Backend Tools Executed ({msg.toolCalls.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.toolCalls.map((tc, tcIdx) => (
                          <span
                            key={tcIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#040711] border border-surface-border text-[11px] font-mono text-cyan-300"
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>{tc.name}()</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Content with UI/UX Designer Rendering */}
                  {msg.role === "assistant" ? (
                    <FormattedChatMessage
                      content={msg.content}
                      allowExport={checkIfExportRequested(idx)}
                    />
                  ) : editingMsgId === msg.id ? (
                    /* Inline User Message Editor */
                    <div className="space-y-2.5 min-w-[260px] sm:min-w-[340px]">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#090F24] border border-accent-cyan text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-accent-cyan resize-none shadow-inner"
                        rows={Math.max(2, Math.min(5, editText.split("\n").length + 1))}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          onClick={() => {
                            setEditingMsgId(null);
                            setEditText("");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-medium transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateAndResubmit(msg.id, editText)}
                          disabled={!editText.trim() || loading}
                          className="px-3.5 py-1.5 rounded-lg bg-accent-cyan hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                          <span>Update &amp; Ask AI</span>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display User Message with Edit Action */
                    <div className="group/user relative">
                      <div className="text-xs sm:text-sm whitespace-pre-line leading-relaxed font-medium pr-7">
                        {msg.content}
                      </div>
                      <button
                        onClick={() => {
                          setEditingMsgId(msg.id);
                          setEditText(msg.content);
                        }}
                        className="absolute top-0 right-0 opacity-0 group-hover/user:opacity-100 transition-opacity p-1 rounded-md bg-black/25 hover:bg-black/50 text-indigo-100 hover:text-white"
                        title="Edit this message"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Timestamp and Latency */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>{msg.timestamp}</span>
                    {msg.latencyMs && (
                      <span className="font-mono text-slate-400">{msg.latencyMs}ms execution</span>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-indigo-300" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-accent-cyan animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl bg-[#090D1A] border border-surface-border text-xs text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span>Auditing ledger &amp; executing PayPal tools via NVIDIA NIM...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Area: Suggestions & Input Form */}
          <div className="p-3.5 border-t border-surface-border bg-[#0B1224]/80 space-y-2">
            {/* Prompt Suggestions */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent-cyan" />
                <span>Suggested:</span>
              </span>
              {SAMPLE_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  disabled={loading}
                  title={item.prompt}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 ${
                    item.isInvoice
                      ? "bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/40 text-emerald-300 hover:text-white hover:border-emerald-400 hover:shadow-sm hover:shadow-emerald-500/20"
                      : "bg-surface-card border border-surface-border hover:border-primary/50 text-slate-300 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-[#090D1A] border border-surface-border focus-within:border-primary transition-all"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Ask PayPilot: "Create an invoice for $50 for Acme", analyze revenue, or chase overdue invoices...'
                disabled={loading}
                className="flex-1 px-3 py-2 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/25 disabled:opacity-50 disabled:hover:bg-primary transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
