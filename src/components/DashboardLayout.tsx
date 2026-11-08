"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  CreditCard,
  Receipt,
  RotateCcw,
  ShieldAlert,
  BarChart3,
  CheckCircle2,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: "Command Center", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Financial Agent", href: "/assistant", icon: Bot, badge: "AI" },
  { name: "Sandbox Checkout", href: "/checkout", icon: CreditCard },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Smart Collections", href: "/invoices", icon: FileText },
  { name: "AI Refund Manager", href: "/refunds", icon: RotateCcw },
  { name: "Fraud & Anomalies", href: "/fraud", icon: ShieldAlert, badge: "2" },
  { name: "Financial Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Approval Center", href: "/approvals", icon: CheckCircle2, badge: "Pending" },
  { name: "Audit & Activity", href: "/audit", icon: Receipt },
  { name: "Settings & APIs", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [merchantName, setMerchantName] = useState("Apex Global Commerce");
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(2);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
        } else {
          return res.json();
        }
      })
      .then((data) => {
        if (data?.user?.merchant?.businessName) {
          setMerchantName(data.user.merchant.businessName);
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-background text-slate-100">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 z-50 bg-[#0A0F1D] border-r border-surface-border">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-surface-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent-cyan flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                PayPilot <span className="text-accent-cyan font-mono text-sm uppercase">AI</span>
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Autonomous FinTech
              </p>
            </div>
          </Link>
        </div>

        {/* PayPal Sandbox Environment Badge */}
        <div className="px-5 py-3 mx-4 my-3 rounded-lg bg-[#0F172A] border border-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">PayPal Sandbox</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-secondary/20 text-cyan-300 font-mono">
            Orders v2
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "text-slate-400 hover:text-slate-100 hover:bg-surface-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : item.badge === "Pending"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-primary/20 text-indigo-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Merchant Profile Footer */}
        <div className="p-4 border-t border-surface-border bg-[#0B1120]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-surface-card border border-surface-border flex items-center justify-center font-bold text-xs text-indigo-400">
                AG
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{merchantName}</p>
                <p className="text-[11px] text-slate-400 truncate">merchant@paypilot.ai</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col flex-1 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-20 bg-background/80 backdrop-blur-md border-b border-surface-border px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-card"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-slate-400">Environment:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                PayPal Developer Sandbox Verified
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/assistant"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border hover:border-primary/50 text-xs font-medium text-slate-200 transition-all"
            >
              <Bot className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Ask AI Operator</span>
            </Link>

            <Link
              href="/approvals"
              className="relative p-2 rounded-lg bg-surface-card border border-surface-border text-slate-300 hover:text-white"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400" />
            </Link>

            <Link
              href="/checkout"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary-hover text-white text-xs font-semibold shadow-md shadow-secondary/30 transition-all"
            >
              <span>Test Checkout</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col p-6">
            <div className="flex items-center justify-between pb-6 border-b border-surface-border">
              <span className="text-lg font-bold">PayPilot AI</span>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 py-6 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                    pathname === item.href
                      ? "bg-primary text-white"
                      : "text-slate-300 hover:bg-surface-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && <span className="text-xs">{item.badge}</span>}
                </Link>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-lg bg-rose-500/20 text-rose-300 font-semibold text-sm"
            >
              Log Out
            </button>
          </div>
        )}

        {/* Main Content View */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
