import type { Metadata } from "next";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayPilot AI — Your Money. Your AI. Your Control.",
  description:
    "Intelligent FinTech & Agentic Payments Operations Platform powered by PayPal Developer Platform and Autonomous AI Agents.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="preconnect" href="https://www.sandbox.paypal.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.paypalobjects.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api-m.sandbox.paypal.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.sandbox.paypal.com" />
        <link rel="dns-prefetch" href="https://www.paypalobjects.com" />
        <link rel="dns-prefetch" href="https://api-m.sandbox.paypal.com" />
      </head>
      <body className="bg-background text-slate-100 min-h-screen antialiased selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
