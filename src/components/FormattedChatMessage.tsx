"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  CreditCard,
  Receipt,
  Calendar,
  ShieldCheck,
  Activity,
  Sparkles,
  Info,
} from "lucide-react";

interface FormattedChatMessageProps {
  content: string;
}

export default function FormattedChatMessage({ content }: FormattedChatMessageProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Check if content contains a Markdown Table
  const tableMatch = content.match(/\|[^\n]+\|\n\|[-|\s]+\|\n([\s\S]+?)(?=\n\n|\n\*\*Takeaway|\n\*\*What happens|\n###|$)/);

  if (tableMatch) {
    const rawTable = tableMatch[0];
    const beforeTable = content.slice(0, tableMatch.index).trim();
    const afterTable = content.slice((tableMatch.index || 0) + rawTable.length).trim();

    // Parse table rows
    const lines = rawTable.trim().split("\n");
    // Skip header and separator
    const dataLines = lines.slice(2);
    const entries: Array<{ key: string; value: string }> = [];

    let detectedAmount: string | null = null;
    let detectedStatus: string | null = null;
    let detectedOrderId: string | null = null;
    let detectedCaptureId: string | null = null;

    for (const line of dataLines) {
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const key = parts[0].replace(/\*\*/g, "").replace(/`/g, "").trim();
        const value = parts[1].trim();

        if (key.toLowerCase().includes("amount") && !detectedAmount) {
          detectedAmount = value.replace(/\*\*/g, "");
        } else if (key.toLowerCase().includes("status") && !detectedStatus) {
          detectedStatus = value.replace(/✅/g, "").replace(/\*\*/g, "").replace(/`/g, "").trim();
        } else if (key.toLowerCase().includes("order id") && !detectedOrderId) {
          detectedOrderId = value.replace(/`/g, "").trim();
        } else if (key.toLowerCase().includes("capture id") && !detectedCaptureId) {
          detectedCaptureId = value.replace(/`/g, "").trim();
        }

        entries.push({ key, value });
      }
    }

    return (
      <div className="space-y-4">
        {/* Header content before table */}
        {beforeTable && (
          <div className="font-semibold text-sm text-white flex items-center gap-2">
            {renderInlineMarkdown(beforeTable)}
          </div>
        )}

        {/* Lead Designer FinTech Card Container */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B1226]/90 via-[#0A0E1F]/90 to-[#070A14]/90 p-5 space-y-4 shadow-xl backdrop-blur-md">
          {/* Top Hero Bar: Amount + Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-surface-border/60">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Transaction Volume
              </span>
              <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                <span className="text-accent-cyan">{detectedAmount || "$10.00 USD"}</span>
              </div>
            </div>

            {detectedStatus && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{detectedStatus}</span>
              </div>
            )}
          </div>

          {/* Quick Copy Chips for IDs */}
          {(detectedOrderId || detectedCaptureId) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {detectedOrderId && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050812] border border-surface-border/70 text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-slate-500 block">PayPal Order ID</span>
                    <span className="font-mono text-cyan-300 font-semibold truncate block">
                      {detectedOrderId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(detectedOrderId!, "orderId")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-surface-border text-slate-400 hover:text-white transition-colors shrink-0"
                    title="Copy Order ID"
                  >
                    {copiedKey === "orderId" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

              {detectedCaptureId && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050812] border border-surface-border/70 text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-slate-500 block">PayPal Capture ID</span>
                    <span className="font-mono text-emerald-400 font-semibold truncate block">
                      {detectedCaptureId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(detectedCaptureId!, "captureId")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-surface-border text-slate-400 hover:text-white transition-colors shrink-0"
                    title="Copy Capture ID"
                  >
                    {copiedKey === "captureId" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Detailed Key-Value Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
            {entries
              .filter(
                (e) =>
                  !e.key.toLowerCase().includes("order id") &&
                  !e.key.toLowerCase().includes("capture id") &&
                  !e.key.toLowerCase().includes("amount") &&
                  !e.key.toLowerCase().includes("status")
              )
              .map((entry, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#070B16] border border-surface-border/50 flex flex-col justify-between"
                >
                  <span className="text-[10px] uppercase font-semibold text-slate-500">
                    {entry.key}
                  </span>
                  <div className="text-slate-200 font-medium mt-0.5 break-words">
                    {renderInlineMarkdown(entry.value)}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Trailing content (e.g. Takeaways, instructions) */}
        {afterTable && renderBodyMarkdown(afterTable)}
      </div>
    );
  }

  // Fallback for regular markdown without tables
  return <div className="space-y-3">{renderBodyMarkdown(content)}</div>;
}

// Renders paragraph blocks, bullet lists, callouts, and action buttons
function renderBodyMarkdown(text: string) {
  const paragraphs = text.split("\n\n");

  return paragraphs.map((para, idx) => {
    const trimmed = para.trim();

    // Check for Takeaway / Insight Callout block
    if (trimmed.startsWith("**Takeaway:**") || trimmed.startsWith("**Takeaway**") || trimmed.startsWith("**Insight:**")) {
      return (
        <div
          key={idx}
          className="p-4 rounded-xl bg-gradient-to-r from-primary/15 via-[#0B132B] to-[#0A0F24] border-l-4 border-l-accent-cyan border border-surface-border/60 text-xs space-y-1 my-2"
        >
          <div className="flex items-center gap-1.5 text-accent-cyan font-bold uppercase tracking-wider text-[10px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Executive Takeaway</span>
          </div>
          <p className="text-slate-200 leading-relaxed font-medium">
            {renderInlineMarkdown(trimmed.replace(/^\*\*(?:Takeaway|Insight):?\*\*:?\s*/i, ""))}
          </p>
        </div>
      );
    }

    // Check for Markdown list items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items = trimmed.split("\n").filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "));
      return (
        <ul key={idx} className="space-y-1.5 pl-1 my-1">
          {items.map((it, itIdx) => (
            <li key={itIdx} className="flex items-start gap-2 text-xs text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0 mt-1.5" />
              <span>{renderInlineMarkdown(it.replace(/^[-*]\s+/, ""))}</span>
            </li>
          ))}
        </ul>
      );
    }

    // Check for Headers
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={idx} className="font-bold text-sm text-white pt-1">
          {renderInlineMarkdown(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
    }

    // Check if paragraph contains PayPal Checkout URL link -> render rich action button
    const linkMatch = trimmed.match(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/);
    if (linkMatch && linkMatch[2].includes("paypal.com")) {
      const [_, label, url] = linkMatch;
      return (
        <div key={idx} className="p-3.5 rounded-xl bg-[#0A1024] border border-secondary/40 space-y-2.5 my-2">
          <p className="text-xs text-slate-300">{renderInlineMarkdown(trimmed.replace(linkMatch[0], ""))}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0070BA] to-[#003087] hover:brightness-110 text-white font-semibold text-xs shadow-lg transition-all"
          >
            <span>{label || "Open PayPal Sandbox Checkout"}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      );
    }

    // Default paragraph
    return (
      <p key={idx} className="text-xs sm:text-sm text-slate-200 leading-relaxed">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
}

// Inline formatting: handles `code`, **bold**, links [text](url)
function renderInlineMarkdown(str: string): React.ReactNode[] {
  // Regex splitting by code tokens, bold tokens, and link tokens
  const tokens = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((tok, i) => {
    if (!tok) return null;

    if (tok.startsWith("`") && tok.endsWith("`")) {
      const code = tok.slice(1, -1);
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-[#050814] border border-surface-border text-cyan-300 font-mono text-[11px] mx-0.5"
        >
          {code}
        </code>
      );
    }

    if (tok.startsWith("**") && tok.endsWith("**")) {
      const text = tok.slice(2, -2);
      return (
        <strong key={i} className="font-bold text-white">
          {text}
        </strong>
      );
    }

    const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [_, label, href] = linkMatch;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent-cyan hover:underline font-semibold"
        >
          <span>{label}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    }

    return tok;
  });
}
