import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

const doc = new jsPDF({
  orientation: "portrait",
  unit: "pt",
  format: "a4",
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 40;
const contentWidth = pageWidth - margin * 2;

let y = margin;

function checkPage(neededHeight = 30) {
  if (y + neededHeight > pageHeight - margin - 20) {
    doc.addPage();
    drawPageHeader();
    y = margin + 30;
  }
}

function drawPageHeader() {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("PAYPILOT AI  |  HACKATHON DEMO VIDEO BLUEPRINT & SCRIPT", margin, margin);
  doc.setFont("helvetica", "normal");
  doc.text("PayPal AI Hackathon 2026", pageWidth - margin - 120, margin);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, margin + 6, pageWidth - margin, margin + 6);
}

// 1. Cover / Title Header
doc.setFillColor(10, 15, 30); // Deep FinTech Navy
doc.roundedRect(margin, y, contentWidth, 80, 8, 8, "F");

doc.setFont("helvetica", "bold");
doc.setFontSize(18);
doc.setTextColor(255, 255, 255);
doc.text("PayPilot AI — 3-Minute Demo Video Script", margin + 16, y + 28);

doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(0, 245, 255); // Electric Cyan
doc.text("Targeting $5,000 Best Demo Delivery & $12,000 Best Overall Awards", margin + 16, y + 46);

doc.setFontSize(9);
doc.setTextColor(148, 163, 184);
doc.text("PayPal Developer Platform  •  NVIDIA NIM  •  APIMatic  •  AG Grid  •  Render", margin + 16, y + 64);

y += 95;

// Section 1: Specs & Recording Setup
function addSectionHeader(title, color = [99, 102, 241]) {
  checkPage(35);
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title, margin + 10, y + 15);
  y += 28;
}

addSectionHeader("1. RECOMMENDED VIDEO SPECS & FREE RECORDING TOOLS");

const specs = [
  ["Ideal Duration:", "2:30 to 3:00 minutes max (keep under 3 mins for judges)"],
  ["Resolution & FPS:", "1080p (Full HD) at 60 fps with 110% browser zoom"],
  ["Audio:", "Clean microphone, quiet room, conversational & energetic tone"],
  ["Free Recording Tools:", "Windows Game Bar (Win + Alt + R) | Loom | OBS Studio | Clipchamp"],
];

for (const [k, v] of specs) {
  checkPage(16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(k, margin + 8, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(v, margin + 130, y + 10);
  y += 16;
}

y += 10;

// Section 2: Timeline Overview
addSectionHeader("2. SCENE TIMELINE & CLICK PROTOCOL OVERVIEW");

const timeline = [
  ["0:00 - 0:30", "The Hook & Problem", "Landing page (/) -> Launch Demo -> Command Center (/dashboard)"],
  ["0:30 - 1:10", "Live AI Briefing & Sweep", "Command Center: Point out Live Briefing Banner -> Click 'Auto-Resolve via AI'"],
  ["1:10 - 1:55", "Agentic Commerce & WhatsApp", "Assistant (/assistant): 'Create invoice $50 David Miller' -> Click 'Send on WhatsApp'"],
  ["1:55 - 2:35", "Approvals & AG Grid Matrix", "Approval Center (/approvals) -> Transactions (/transactions) AG Grid sorting"],
  ["2:35 - 3:00", "Sponsor Stack & Grand Finale", "Recap PayPal REST v2, NVIDIA NIM, APIMatic, AG Grid, Render deployment"],
];

for (const [time, title, action] of timeline) {
  checkPage(24);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 20, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(14, 116, 144);
  doc.text(time, margin + 6, y + 13);
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin + 70, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(action, margin + 210, y + 13);
  y += 24;
}

y += 10;

// Section 3: Word-For-Word Script
addSectionHeader("3. WORD-FOR-WORD DEMO SCRIPT (VERBATIM)");

const scriptParts = [
  {
    part: "SCENE 1: THE HOOK & PROBLEM STATEMENT [0:00 - 0:30]",
    screen: "Screen: Landing Page (/) -> Click 'Launch Demo' -> Command Center (/dashboard)",
    speech:
      `"Meet PayPilot AI—the autonomous financial operations engine built for merchants on the PayPal Developer Platform. Managing receivables, chasing overdue invoices, auditing refund claims, and detecting payment anomalies typically takes hours of manual work. PayPilot AI turns everyday merchant ledgers into a self-driving, proactive financial agent, governed by a strict Human-in-the-Loop Approval Center."`,
  },
  {
    part: "SCENE 2: PROACTIVE COMMAND CENTER & LIVE AI SWEEP [0:30 - 1:10]",
    screen: "Screen: /dashboard -> Hover over Live Briefing Banner -> Click 'Auto-Resolve via AI'",
    speech:
      `"The moment you open the Command Center, PayPilot AI doesn't wait for you to ask—it proactively audits your live PayPal ledger in real time. Notice our Live Executive Briefing banner. With a single click on 'Auto-Resolve via AI', the agent autonomously audits receivables and stages personalized collection notices without dispatching rogue actions."`,
  },
  {
    part: "SCENE 3: AGENTIC CONVERSATIONAL COMMERCE & 1-CLICK WHATSAPP [1:10 - 1:55]",
    screen: "Screen: /assistant -> Type 'Create invoice for $50 for David Miller' -> Click 'Send on WhatsApp'",
    speech:
      `"Over in the AI Financial Agent, we interact using natural language powered by NVIDIA NIM function calling and APIMatic's instant PayPal context plugin. When we bill David Miller $50, the AI creates an official PayPal sandbox checkout order. Notice the zero-hallucination grounded citation badge linking directly to the ledger. And through our multi-channel outreach engine, a single click on 'Send on WhatsApp' opens WhatsApp with a pre-formatted message and direct PayPal checkout link ready to send to the client."`,
  },
  {
    part: "SCENE 4: HUMAN APPROVAL CENTER & AG GRID FINTECH MATRIX [1:55 - 2:35]",
    screen: "Screen: /approvals -> Show WhatsApp button & actions -> /transactions & /invoices AG Grid",
    speech:
      `"Autonomous doesn't mean uncontrolled. In our Human Approval Center, sensitive financial dispatches and refunds are safeguarded—requiring explicit merchant confirmation. For deep data analysis, we integrated AG Grid with custom dark quartz theme virtualization across our transactions and invoicing matrices, giving merchants sub-millisecond filtering, sorting, and seamless tracking of PayPal Order and Capture IDs."`,
  },
  {
    part: "SCENE 5: CONCLUSION & SPONSOR STACK WRAP-UP [2:35 - 3:00]",
    screen: "Screen: Return to /dashboard or Landing Page (/) -> Hold final view",
    speech:
      `"PayPilot AI bridges the gap between PayPal's payment rail and agentic commerce: PayPal Developer Platform for Orders v2, Captures, and Webhooks; NVIDIA NIM for agent orchestration; APIMatic for structured API context; AG Grid for high-performance financial grids; and containerized deployment on Render. PayPilot AI: Your Money, Your AI, Your Control. Thank you!"`,
  },
];

for (const sp of scriptParts) {
  checkPage(80);

  // Subheader
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, contentWidth, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text(sp.part, margin + 6, y + 12);
  y += 22;

  // Screen cue
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(sp.screen, margin + 6, y);
  y += 14;

  // Speech block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const splitText = doc.splitTextToSize(sp.speech, contentWidth - 16);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, splitText.length * 11 + 10, 3, 3, "FD");

  doc.text(splitText, margin + 8, y + 12);
  y += splitText.length * 11 + 18;
}

y += 5;

// Section 4: 4 Pro Tips to Win $5,000 Best Demo
addSectionHeader("4. PRO TIPS TO WIN $5,000 BEST DEMO DELIVERY");

const tips = [
  "1. Zoom In to 110% or 125%: Press Ctrl + Plus so judges on laptops or mobile can clearly read numbers and badges.",
  "2. Have Browser Tabs Pre-Loaded: Keep /dashboard, /assistant, /approvals, and /transactions tabs open in advance.",
  "3. Click the Live Elements: Click 'Auto-Resolve via AI' and 'Send on WhatsApp'—live visual interaction wins top scores.",
  "4. Energetic, Confident Pacing: Rehearse once with a timer before recording; hit the 2:45 mark smoothly.",
];

for (const tip of tips) {
  checkPage(16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(16, 185, 129);
  doc.text("✔", margin + 6, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(tip, margin + 22, y + 10);
  y += 15;
}

// Page Numbers Footer
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Page ${i} of ${totalPages}  |  PayPilot AI Hackathon Submission`,
    pageWidth / 2 - 80,
    pageHeight - 20
  );
}

const outputPath = path.resolve("d:/paypal-hackthon/PayPilot_AI_Demo_Video_Script.pdf");
fs.writeFileSync(outputPath, Buffer.from(doc.output("arraybuffer")));
console.log("PDF successfully generated at:", outputPath);
