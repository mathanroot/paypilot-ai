"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  Download,
  FileText,
  FileSpreadsheet,
  Table,
} from "lucide-react";
import { exportToPdf, exportToExcel, exportToCsv, parseFinancialContent } from "@/lib/exportUtils";

interface FormattedChatMessageProps {
  content: string;
  allowExport?: boolean;
}

export default function FormattedChatMessage({ content, allowExport = false }: FormattedChatMessageProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [exportedType, setExportedType] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExport = (type: "pdf" | "excel" | "csv") => {
    setExportingType(type);
    try {
      const data = parseFinancialContent(content);
      if (type === "pdf") {
        exportToPdf(data);
      } else if (type === "excel") {
        exportToExcel(data);
      } else if (type === "csv") {
        exportToCsv(data);
      }
      setExportedType(type);
      setTimeout(() => setExportedType(null), 3000);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExportingType(null);
    }
  };

  // Only show export toolbar when user explicitly requested a report / PDF / Excel / export
  // Or when the message explicitly indicates a compiled downloadable report
  const isExportable =
    allowExport === true ||
    (content.toLowerCase().includes("executive financial report") && content.toLowerCase().includes("1-click export")) ||
    content.toLowerCase().includes("ready for direct download");

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
    let detectedLabel: string = "Transaction Volume";
    let detectedStatus: string | null = null;
    let detectedOrderId: string | null = null;
    let detectedCaptureId: string | null = null;

    for (const line of dataLines) {
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const key = parts[0].replace(/\*\*/g, "").replace(/`/g, "").trim();
        const value = parts[1].trim();
        const lowerKey = key.toLowerCase();

        // Priority 1: Check for Gross Volume / Captured Volume / Revenue / Amount / Total
        if (
          (lowerKey.includes("gross") || lowerKey.includes("volume") || lowerKey.includes("revenue")) &&
          !detectedAmount &&
          (value.includes("$") || value.match(/\b\d+(\.\d{2})?\b/))
        ) {
          detectedAmount = value.replace(/\*\*/g, "").replace(/`/g, "").trim();
          detectedLabel = key.replace(/\*\*/g, "").replace(/`/g, "").trim();
        } else if (
          (lowerKey.includes("amount") || lowerKey.includes("total")) &&
          !detectedAmount &&
          (value.includes("$") || value.match(/\b\d+(\.\d{2})?\b/))
        ) {
          detectedAmount = value.replace(/\*\*/g, "").replace(/`/g, "").trim();
          detectedLabel = key.replace(/\*\*/g, "").replace(/`/g, "").trim();
        } else if (lowerKey.includes("status") && !detectedStatus) {
          detectedStatus = value.replace(/✅/g, "").replace(/\*\*/g, "").replace(/`/g, "").trim();
        } else if (lowerKey.includes("order id") && !detectedOrderId) {
          detectedOrderId = value.replace(/`/g, "").trim();
        } else if (lowerKey.includes("capture id") && !detectedCaptureId) {
          detectedCaptureId = value.replace(/`/g, "").trim();
        }

        entries.push({ key, value });
      }
    }

    // Fallback: If detectedAmount still not found, search all entries for the first money value ($)
    if (!detectedAmount) {
      for (const entry of entries) {
        const cleanedVal = entry.value.replace(/\*\*/g, "").replace(/`/g, "").trim();
        if (
          cleanedVal.startsWith("$") ||
          cleanedVal.includes("$") ||
          cleanedVal.includes("USD") ||
          cleanedVal.includes("GBP") ||
          cleanedVal.includes("EUR")
        ) {
          detectedAmount = cleanedVal;
          detectedLabel = entry.key.replace(/\*\*/g, "").replace(/`/g, "").trim();
          break;
        }
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
          {(detectedAmount || detectedStatus) && (
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-surface-border/60">
              {detectedAmount && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {detectedLabel || "Volume / Amount"}
                  </span>
                  <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1 font-mono">
                    <span className="text-accent-cyan">{detectedAmount}</span>
                  </div>
                </div>
              )}

              {detectedStatus && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{detectedStatus}</span>
                </div>
              )}
            </div>
          )}

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
              .filter((e) => {
                const lk = e.key.toLowerCase();
                if (lk.includes("order id") || lk.includes("capture id") || lk.includes("status")) return false;
                // If this exact metric is featured as the hero metric, avoid redundant duplicate card
                if (detectedAmount && detectedLabel && lk === detectedLabel.toLowerCase()) return false;
                if (detectedAmount && lk.includes("amount") && detectedLabel.toLowerCase().includes("amount")) return false;
                return true;
              })
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

          {/* Instant Export Action Toolbar (Only when export requested) */}
          {isExportable && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-surface-border/60">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <Download className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Export Report:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={exportingType === "pdf"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F162A] hover:bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold shadow-sm transition-all active:scale-95"
                  title="Download verified PDF report"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{exportedType === "pdf" ? "Downloaded PDF!" : "PDF Report"}</span>
                </button>

                <button
                  onClick={() => handleExport("excel")}
                  disabled={exportingType === "excel"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F162A] hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm transition-all active:scale-95"
                  title="Download Excel spreadsheet (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{exportedType === "excel" ? "Downloaded .XLSX!" : "Excel (.xlsx)"}</span>
                </button>

                <button
                  onClick={() => handleExport("csv")}
                  disabled={exportingType === "csv"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F162A] hover:bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-sm transition-all active:scale-95"
                  title="Download CSV table"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>{exportedType === "csv" ? "Downloaded CSV!" : "CSV"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trailing content (e.g. Takeaways, instructions) */}
        {afterTable && renderBodyMarkdown(afterTable)}
      </div>
    );
  }

  // Fallback for regular markdown without tables
  return (
    <div className="space-y-3">
      {renderBodyMarkdown(content)}

      {/* Render 1-click Download Bar ONLY when export was explicitly requested */}
      {isExportable && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-[#0B1426] via-[#090F1F] to-[#070A16] border border-surface-border/70 flex flex-wrap items-center justify-between gap-3 mt-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-accent-cyan" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">1-Click Financial Export</span>
              <span className="text-[10px] text-slate-400 block">Download authentic binary files verified by PayPal Sandbox</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExport("pdf")}
              disabled={exportingType === "pdf"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1528] hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold shadow-sm transition-all active:scale-95"
              title="Download official PDF report"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>{exportedType === "pdf" ? "Downloaded PDF!" : "Export PDF"}</span>
            </button>

            <button
              onClick={() => handleExport("excel")}
              disabled={exportingType === "excel"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1528] hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm transition-all active:scale-95"
              title="Download Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{exportedType === "excel" ? "Downloaded .XLSX!" : "Export Excel (.xlsx)"}</span>
            </button>

            <button
              onClick={() => handleExport("csv")}
              disabled={exportingType === "csv"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1528] hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-sm transition-all active:scale-95"
              title="Download CSV table"
            >
              <Table className="w-3.5 h-3.5 text-cyan-400" />
              <span>{exportedType === "csv" ? "Downloaded CSV!" : "Export CSV"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Renders paragraph blocks, bullet lists, callouts, and clean UI components (no raw code dumps)
function renderBodyMarkdown(text: string) {
  const paragraphs = text.split("\n\n");

  return paragraphs.map((para, idx) => {
    const trimmed = para.trim();

    // Intercept code blocks (```json ... ``` or raw json dumps) and transform into clean UI parameter cards
    if (
      trimmed.startsWith("```") ||
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("json {") && trimmed.endsWith("}"))
    ) {
      let clean = trimmed.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
      if (clean.startsWith("json ")) clean = clean.slice(5).trim();
      try {
        const parsed = JSON.parse(clean);
        const flatEntries: Array<{ label: string; value: string }> = [];
        const extractEntries = (obj: any, prefix = "") => {
          if (!obj || typeof obj !== "object") return;
          for (const [k, v] of Object.entries(obj)) {
            const label = prefix ? `${prefix}.${k}` : k;
            if (v && typeof v === "object" && !Array.isArray(v)) {
              extractEntries(v, label);
            } else if (!Array.isArray(v)) {
              flatEntries.push({ label, value: String(v) });
            }
          }
        };
        extractEntries(parsed);

        return (
          <div key={idx} className="p-3.5 rounded-xl bg-[#070B16] border border-surface-border/60 space-y-2.5 my-2 shadow-md">
            <div className="flex items-center gap-1.5 text-accent-cyan font-bold text-[10px] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Transaction Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {flatEntries.slice(0, 10).map((entry, eIdx) => (
                <div key={eIdx} className="p-2 rounded-lg bg-[#050812] border border-surface-border/40">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">{entry.label}</span>
                  <span className="font-mono text-cyan-300 font-semibold truncate block mt-0.5">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      } catch {
        // If not valid JSON, render as plain styled text without monospace fences
        return (
          <p key={idx} className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
            {renderInlineMarkdown(clean)}
          </p>
        );
      }
    }

    // Check if paragraph is telling the user to use Print -> Save as PDF or copy-paste into Word
    if (
      trimmed.includes("PDF Ready") ||
      trimmed.includes("Print -> Save as PDF") ||
      trimmed.includes("copy the content into your preferred document editor")
    ) {
      return (
        <div
          key={idx}
          className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-[#0B1528] to-[#090D1C] border border-emerald-500/30 text-xs space-y-1.5 my-2"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Official Financial Report Ready for Direct Download</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Report verified against your PayPal developer settlement ledger. Use the 1-Click Export buttons below to download authentic binary documents (.pdf, .xlsx, .csv).
          </p>
        </div>
      );
    }

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

// Grounded Data Citation Badge Renderer
function renderCitationBadge(id: string, key: any) {
  const cleanId = id.trim();
  const isInvoice = /^INV-\d{4}-\d+/i.test(cleanId);
  const isOrder = /^(ORD-[0-9A-Z]+|[0-9A-Z]{17})$/i.test(cleanId);
  const isCapture = /^(CAP-[0-9A-Z]+|[0-9A-Z]{17}[A-Z0-9]*)$/i.test(cleanId) && !isOrder;

  if (isInvoice) {
    return (
      <Link
        key={key}
        href="/invoices"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 font-mono text-[11px] mx-1 transition group shadow-sm"
        title="View grounded record in Smart Collections"
      >
        <Receipt className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span className="font-semibold">{cleanId}</span>
        <ExternalLink className="w-2.5 h-2.5 text-cyan-400/80" />
      </Link>
    );
  }

  if (isOrder) {
    return (
      <Link
        key={key}
        href="/transactions"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/70 hover:bg-blue-900 border border-blue-500/40 text-blue-200 font-mono text-[11px] mx-1 transition group shadow-sm"
        title="Verify live PayPal Sandbox order in Transactions ledger"
      >
        <CreditCard className="w-3 h-3 text-blue-400 group-hover:scale-110 transition-transform" />
        <span className="font-semibold">{cleanId}</span>
        <ExternalLink className="w-2.5 h-2.5 text-blue-400/80" />
      </Link>
    );
  }

  if (isCapture) {
    return (
      <Link
        key={key}
        href="/transactions"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 font-mono text-[11px] mx-1 transition group shadow-sm"
        title="Verified cryptographic PayPal settlement capture"
      >
        <ShieldCheck className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-semibold">{cleanId}</span>
        <ExternalLink className="w-2.5 h-2.5 text-emerald-400/80" />
      </Link>
    );
  }

  return (
    <code
      key={key}
      className="px-1.5 py-0.5 rounded-md bg-[#050814] border border-surface-border text-cyan-300 font-mono text-[11px] mx-0.5"
    >
      {cleanId}
    </code>
  );
}

// Inline formatting: handles `code`, **bold**, links [text](url), and grounded citations
function renderInlineMarkdown(str: string): React.ReactNode[] {
  // Regex splitting by code tokens, bold tokens, and link tokens
  const tokens = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((tok, i) => {
    if (!tok) return null;

    if (tok.startsWith("`") && tok.endsWith("`")) {
      const code = tok.slice(1, -1);
      return renderCitationBadge(code, i);
    }

    if (tok.startsWith("**") && tok.endsWith("**")) {
      const text = tok.slice(2, -2);
      // If bold text matches an order or invoice, make it a citation badge!
      if (/^(INV-\d{4}-\d+|ORD-[0-9A-Z]+|[0-9A-Z]{17}|CAP-[0-9A-Z]+)$/i.test(text.trim())) {
        return renderCitationBadge(text.trim(), i);
      }
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

    // Also check for raw unbackticked citations like INV-2026-001 or ORD-9882190A in plain text
    const subParts = tok.split(/(\b(?:INV-\d{4}-\d+|ORD-[0-9A-Z]{6,10}|[0-9A-Z]{17})\b)/g);
    if (subParts.length > 1) {
      return (
        <React.Fragment key={i}>
          {subParts.map((sp, spIdx) => {
            if (/^(INV-\d{4}-\d+|ORD-[0-9A-Z]{6,10}|[0-9A-Z]{17})$/i.test(sp)) {
              return renderCitationBadge(sp, `${i}-${spIdx}`);
            }
            return sp;
          })}
        </React.Fragment>
      );
    }

    return tok;
  });
}
