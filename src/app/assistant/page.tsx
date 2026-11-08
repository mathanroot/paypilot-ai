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
} from "lucide-react";

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

const SAMPLE_PROMPTS = [
  "Analyze my business payments, identify unpaid invoices, and explain my financial performance.",
  "Find all overdue invoices and prepare reminders.",
  "Create a PayPal payment order for $150.",
  "Check my active fraud alerts and transaction anomalies.",
  "Audit my refund patterns and customer return rates.",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I am **PayPilot AI**, your autonomous financial operations agent integrated with your merchant ledger and the **PayPal Developer Platform**.\n\nI can execute genuine backend operations such as:\n- Auditing transaction histories and revenue performance\n- Creating genuine PayPal Orders v2\n- Detecting unpaid invoices and staging personalized payment reminders\n- Analyzing refund eligibility and routing approvals\n\nHow can I assist your financial operations today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to contact AI agent");
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

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-5xl mx-auto space-y-4">
        {/* Header Banner */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent-cyan flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>AI Financial Operations Agent</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-indigo-300 font-mono">
                  Tools v2 Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Connected to PayPal Sandbox Orders v2, Capture v2, and SQLite Ledger.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Human Approval Guard Enabled</span>
          </div>
        </div>

        {/* Chat History Box */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg) => (
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
                    : "bg-surface-card border border-surface-border text-slate-200"
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
                      {msg.toolCalls.map((tc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0A0E1A] border border-surface-border text-[11px] font-mono text-cyan-300"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span>{tc.name}()</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div className="text-xs sm:text-sm whitespace-pre-line leading-relaxed space-y-2">
                  {msg.content}
                </div>

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
              <div className="p-4 rounded-2xl bg-surface-card border border-surface-border text-xs text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>Auditing ledger &amp; executing PayPal tools...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Suggestions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">
              Suggested:
            </span>
            {SAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-surface-card border border-surface-border hover:border-primary/50 text-[11px] text-slate-300 hover:text-white transition-all disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 p-1.5 rounded-xl bg-surface-card border border-surface-border focus-within:border-primary transition-all"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask PayPilot to analyze revenue, create a PayPal order, or chase overdue invoices..."
              disabled={loading}
              className="flex-1 px-3 py-2 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
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
    </DashboardLayout>
  );
}
