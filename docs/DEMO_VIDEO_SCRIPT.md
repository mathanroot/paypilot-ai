# PayPilot AI — 3-Minute YouTube Demo Video Script

**Video Title:** PayPilot AI — Agentic Payments & Autonomous FinTech with PayPal Developer Platform  
**Target Duration:** 2 minutes 50 seconds (Under 3 minutes strict hackathon requirement)  
**Host/Narration:** Senior FinTech Product Lead & Systems Architect  
**Visual Style:** 1080p 60fps screen recording, clear studio audio, crisp dark-navy interface visuals.

---

## Scene-by-Scene Timeline & Narration

### [0:00 – 0:20] Hook & Problem Introduction
- **Visual:** Landing page (`/`) showcasing the tagline: *"Your Money. Your AI. Your Control."* Smooth scroll through the system architecture diagram.
- **Narration:**
  > *"Every month, digital merchants and small businesses lose thousands of dollars chasing unpaid invoices, handling manual customer refunds, and clicking through disconnected payment portals. Chatbots only offer generic text, while traditional dashboards are passive. Welcome to **PayPilot AI**—an autonomous financial operations platform built for the global PayPal AI Hackathon that turns AI into an active financial operator, powered by the official PayPal Developer Platform."*

### [0:20 – 0:45] 1-Click Judge Access & Command Center Overview
- **Visual:** Click "1-Click Launch Judge Demo" on `/login` -> Redirect to `/dashboard`. Camera highlights the live metric cards ($4,050 GMV, 96.4% settlement rate) and interactive revenue chart.
- **Narration:**
  > *"Judges can explore immediately with our 1-click pre-seeded merchant profile. Here in the Financial Command Center, merchants get a unified real-time pulse of their business: gross captured volume, net revenue, and accounts receivable, backed by an interactive Recharts velocity chart with custom date filters."*

### [0:45 – 1:15] Conversational AI Financial Agent in Action
- **Visual:** Switch to `/assistant`. Select prompt pill: *"Analyze my business payments, identify unpaid invoices, and explain my financial performance."*
- **Visual:** Watch the AI execute real backend tools: `get_revenue_summary` and `get_pending_invoices`. Terminal badges appear in real-time with latency indicators.
- **Narration:**
  > *"Instead of generic advice, our AI agent invokes real backend tools against our normalized ledger. Notice the badges: it executed `get_revenue_summary` and `get_pending_invoices` in 412 milliseconds. It identifies two overdue accounts—StrataFlow Tech and Vanguard Logistics—and asks whether to draft automated collection reminders with direct PayPal checkout links."*

### [1:15 – 1:45] Real PayPal Sandbox Checkout & Verification
- **Visual:** Navigate to `/checkout`. Select the "Enterprise FinTech Suite ($1,200.00)" or enter custom amount. Click "Generate PayPal Order". Order `#DEMO-ORDER-...` created. Click "Execute Server Capture". Status updates to `COMPLETED` with Capture ID `#CAP-...` and verified receipt.
- **Narration:**
  > *"Here is our core PayPal integration. PayPilot contacts the PayPal Orders v2 API with intent: CAPTURE. The customer approves, and our backend explicitly invokes the PayPal Capture API with strict idempotency protections. Notice that we never mark a transaction completed without cryptographic verification from PayPal."*

### [1:45 – 2:10] AI Smart Collections & Human Approval Center
- **Visual:** Navigate to `/invoices`. Click "Prepare AI Reminder" on StrataFlow Tech ($1,800.00 overdue). Success banner appears: *"Staged in Human Approval Center"*.
- **Visual:** Navigate to `/approvals`. Show the pending action with action parameters and direct PayPal link. Click "Approve & Execute via PayPal". Status switches to `EXECUTED`.
- **Narration:**
  > *"Here is PayPilot's core innovation: **Human-in-the-Loop Governance**. When the AI prepares an invoice reminder or customer refund, it is never dispatched autonomously without authorization. It stages into our Human Approval Center. With one click, the merchant reviews the parameters, confirms authorization, and dispatches the action with full audit logging."*

### [2:10 – 2:35] AI Fraud Monitoring & Activity Audit Center
- **Visual:** Navigate to `/fraud` showing anomaly alerts (velocity spikes and high-value deviations). Switch to `/audit` showing immutable ledger logs and PayPal webhook event inspection.
- **Narration:**
  > *"Our deterministic Anomaly Guard protects checkouts in real-time, detecting velocity spikes and billing mismatches with explainable risk scores. In the Activity Center, all actions, tool calls, and cryptographic PayPal webhook deliveries are recorded in an immutable audit ledger."*

### [2:35 – 2:50] Conclusion & Future Vision
- **Visual:** Return to `/dashboard`. Camera zooms out to show the responsive layout. GitHub repository and MIT license shown.
- **Narration:**
  > *"PayPilot AI bridges the PayPal Developer Platform and modern AI to redefine agentic fintech. Fully tested, production compiled, open source under MIT, and ready for deployment. Thank you!"*

---

## Recording Checklist
- [ ] Screen resolution set to 1920x1080.
- [ ] Browser zoom set to 100%.
- [ ] Seed database freshly loaded (`node prisma/seed.js`).
- [ ] Audio normalized with zero background noise.
- [ ] Strict recording timer monitored to stay under 2 minutes 50 seconds.
- [ ] Video title, description, and tags prepared for YouTube.
