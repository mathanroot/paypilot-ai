# PayPilot AI — Your Money. Your AI. Your Control.

> **Global PayPal AI Hackathon Official Project Submission**  
> *Autonomous FinTech & Agentic Payments Operations Platform powered by the PayPal Developer Platform & AI Agents.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2.15-black.svg)](https://nextjs.org/)
[![PayPal Sandbox](https://img.shields.io/badge/PayPal-Orders_v2_%2B_Capture_v2-003087.svg)](https://developer.paypal.com/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA_NIM-Nemotron_3.5_Lightning-76B900.svg)](https://build.nvidia.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.21.1-2D3748.svg)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Tests-11_Passed-6E9F18.svg)](https://vitest.dev/)

---

## 1. Project Introduction
**PayPilot AI** is an intelligent financial operations platform that transforms passive payment dashboards into an autonomous, proactive financial operations agent for businesses and merchants. 

Built specifically for the **Global PayPal AI Hackathon**, PayPilot AI empowers business owners to interact with their merchant ledger using natural language. Instead of manually clicking through complex menus to generate invoices, audit payment histories, check overdue receivables, or execute customer refunds, merchants delegate these tasks to an intelligent agent directly integrated with the **official PayPal Developer Sandbox APIs**.

To ensure banking-grade financial safety, PayPilot AI introduces a **Human Approval Center**: the AI prepares operations, verifies eligibility, and stages actions, but never executes sensitive funds transfers or customer messages without explicit merchant authorization.

---

## 2. Problem Statement
Small and medium-sized businesses (SMBs), SaaS startups, and independent merchants face substantial friction managing daily financial workflows:
- **Delayed Receivables:** Chasing unpaid invoices is tedious and uncomfortable. Millions of dollars languish in 30+ day overdue receivables because merchants lack automated, polite follow-ups.
- **Fragmented Portals:** Business owners bounce between accounting software, CRM spreadsheets, and payment gateway dashboards to reconcile numbers.
- **Refund Risks:** Handling customer refund claims manually often leads to duplicate refunds or issuing refunds on uncaptured orders.
- **Checkout Fraud Blindspots:** Velocity card attacks and unusual checkout deviations often slip past small merchants until costly chargebacks hit.
- **Chatbot Ineffectiveness:** Most contemporary AI chatbots are purely decorative text generators with no backend execution capabilities, hallucinating financial numbers and leaving users to perform the actual work themselves.

---

## 3. Proposed Solution
PayPilot AI bridges large language models with production payment rails to create a genuine **Agentic Financial Operator**:
1. **Natural-Language Operations:** Merchants instruct the agent in plain English: *"Analyze my business payments, identify unpaid invoices, prepare reminders, and explain my revenue performance."*
2. **Deterministic Backend Execution:** The AI model selects from 12 strictly validated server tools, querying real database records and invoking PayPal REST APIs v2.
3. **Smart Collections:** Autonomous accounts receivable monitoring detects overdue debts, calculates outstanding balances, drafts personalized reminders, and embeds direct 1-click PayPal checkout links.
4. **Human-in-the-Loop Governance:** Financial actions (refunds, large transfers, overdue reminders) are staged in an approval queue, maintaining 100% human control over capital.
5. **Real-Time Verification:** Every payment transition is verified against PayPal's cryptographic responses and webhook notifications.

---

## 4. Core Innovation
PayPilot AI is not another static dashboard or superficial chatbot. Its key differentiators include:
- **Actionable AI Agent:** Performs concrete read and write operations against the PayPal Developer Platform rather than merely generating text advice.
- **Zero Hallucination Guarantee:** The agent is architected with strict tool constraints. Financial metrics are computed exclusively from database records.
- **Human-in-the-Loop Safeguards:** Autonomous preparation paired with authorized human execution ensures regulatory and operational compliance.
- **Cryptographic Webhook Reconciliation:** Real-time synchronization of ledger states with PayPal webhook events (`CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, etc.) with idempotency protections.

---

## 5. Key Features & Modules

| Module | Purpose & Capabilities |
|:---|:---|
| **Landing Page** | Fintech branding, architectural transparency, feature showcase, and instant demo access. |
| **Merchant Authentication** | Secure sessions with HTTP-only cookies, bcrypt password hashing, and 1-click judge demo login. |
| **Financial Command Center** | Live KPI metrics (GMV, net revenue, refund ratio, receivables), Recharts revenue trends, and date filters. |
| **AI Payment Assistant** | Conversational agent powered by NVIDIA NIM tool/function calling with full execution transparency. |
| **PayPal Payment Gateway** | End-to-end sandbox checkout flow: item selection, Orders v2 creation, client checkout, and Capture v2 verification. |
| **AI Smart Collection Agent** | Overdue accounts receivable tracker; prepares diplomatic collection reminders with PayPal payment links. |
| **AI Refund Manager** | Eligibility auditor, customer LTV evaluation, duplicate refund prevention, and approval staging. |
| **Fraud & Anomaly Guard** | Real-time heuristic detection of checkout velocity spikes, abnormal cart deviations, and IP mismatches. |
| **Financial Analytics** | Historical cash flow analysis, Days Sales Outstanding (DSO), and AI predictive revenue forecasts. |
| **Human Approval Center** | Centralized authorization queue for sensitive financial operations with 1-click execution. |
| **Activity & Audit Center** | Immutable audit log of user actions, AI tool calls, payment states, and raw webhook deliveries. |
| **Developer Settings** | PayPal Sandbox API credentials, webhook verification status, and AI model parameters. |

---

## 6. Official PayPal Integration

PayPilot AI integrates the official **PayPal Developer Platform (Sandbox)** using current REST APIs v2:

- **PayPal Orders API v2:**  
  `POST /v2/checkout/orders` with `intent: 'CAPTURE'`, purchase units, breakdowns, custom IDs, and application context.
- **PayPal Capture API v2:**  
  `POST /v2/checkout/orders/{id}/capture` with strict idempotency keys (`PayPal-Request-Id`). Unverified approvals are never marked completed.
- **PayPal Order Inspection:**  
  `GET /v2/checkout/orders/{id}` for live settlement verification.
- **PayPal Refund API v2:**  
  `POST /v2/payments/captures/{id}/refund` verifying remaining refundable balance to prevent over-refunding.
- **PayPal Webhooks API:**  
  `POST /v1/notifications/verify-webhook-signature` using HMAC-SHA256 and RSA cryptographic validation.
- **Supported Webhook Events:**  
  `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`.

---

## 7. AI Implementation & Tools

### Architecture
- **Provider:** NVIDIA NIM (National Institute of Standards / NVIDIA Inference Microservice) hosted at `https://integrate.api.nvidia.com/v1`.
- **Model:** `nvidia/nemotron-3.5-lightning-30b-a3b` with structured function/tool calling.
- **Connection Health Check:** `/api/ai/health` providing real-time latency and status probes.
- **Fallback Engine:** Integrated deterministic semantic router ensuring offline hackathon judges can test all 12 tools without supplying personal NVIDIA API keys.

### 12 Concrete Backend AI Tools:
1. `get_transactions` — Queries payment ledger with status and limit filtering.
2. `get_payment_details` — Retrieves payment records and PayPal lifecycle event history.
3. `get_revenue_summary` — Computes GMV, net revenue, settlement velocity, and receivables.
4. `get_pending_invoices` — Filters unpaid and overdue invoices requiring collection attention.
5. `create_paypal_order` — Creates genuine PayPal Orders v2 for clients.
6. `capture_paypal_order` — Captures approved PayPal orders with server verification.
7. `create_refund` — Audits refund eligibility and stages authorization into Approval Center.
8. `analyze_refund_patterns` — Analyzes refund velocity and customer return rates.
9. `detect_transaction_anomalies` — Executes deterministic risk heuristics.
10. `prepare_payment_reminder` — Drafts personalized reminder with direct PayPal checkout link.
11. `generate_financial_report` — Compiles executive KPI breakdowns and cash flow recommendations.
12. `get_customer_payment_history` — Inspects customer lifetime value (LTV) and settlement reliability.

---

## 8. System Architecture

```
User / Merchant Browser
          │ (HTTPS / Session Cookie)
          ▼
Next.js 14 App Router (Full-Stack Gateway)
   ├── Auth Middleware (jose / bcryptjs)
   ├── API Route Handlers (Zod Schema Validation)
   │     ├── /api/paypal/* (Orders v2, Capture v2, Refund v2, Webhooks)
   │     ├── /api/ai/chat (NVIDIA NIM Function Calling & Tool Execution)
   │     ├── /api/approvals (Human-in-the-Loop Authorization Engine)
   │     └── /api/analytics, /api/invoices, /api/fraud, /api/audit
   │
   ├── AI Agent Orchestrator (12 Registered Backend Tools)
   │     └── Intercepts sensitive operations -> Stages in ApprovalRequest
   │
   └── Prisma ORM (14 Relational Models)
         ├── SQLite (Local Zero-Config Development & Automated Testing)
         └── PostgreSQL (Production Deployment on Render / Neon / Supabase)
```

---

## 9. Technology Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend:** Node.js, Next.js Route Handlers, Zod Validation, Jose (JWT), BcryptJS.
- **Payment Infrastructure:** PayPal Developer Sandbox, Orders API v2, Capture API v2, Refund API v2, Webhooks.
- **AI Infrastructure:** NVIDIA NIM (Microservices hosted at https://integrate.api.nvidia.com/v1), Function Calling, Structured Tool Calling.
- **Database & ORM:** PostgreSQL / SQLite, Prisma ORM 5.21.
- **Testing:** Vitest 2.1 (11 automated test cases).

---

## 10. Installation & Setup

### Prerequisites
- Node.js v18.0.0 or higher (Tested on Node v20 & v24)
- npm or pnpm
- Git

### Quick Setup Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/mathanroot/paypilot-ai.git
   cd paypilot-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *(The default `.env` is pre-configured with zero-config SQLite and sandbox demo credentials).*

4. **Initialize the database and seed demo records:**
   ```bash
   npx prisma generate
   npx prisma db push
   node prisma/seed.js
   ```

---

## 11. Environment Configuration

Edit `.env` to configure your credentials:

```ini
# PayPal Developer Sandbox
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_API_URL=https://api-m.sandbox.paypal.com

# AI Model Configuration (NVIDIA NIM Microservices)
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b

# Database Configuration (SQLite default for local, PostgreSQL for Render)
DATABASE_URL="file:./dev.db"

# Security & App URL
JWT_SECRET=paypilot-super-secret-jwt-key-secure-2026-hackathon
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_MODE=true
```

---

## 12. Running the Application

### Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Run
```bash
npm run build
npm start
```

---

## 13. Automated Testing

PayPilot AI includes automated unit and integration tests covering Authentication, PayPal APIs, and AI Agent Tools.

Run all tests:
```bash
npm test
```

### Verified Test Results:
```
 ✓ tests/paypal.test.ts (4 tests)
 ✓ tests/ai-tools.test.ts (4 tests)
 ✓ tests/auth.test.ts (3 tests)

 Test Files  3 passed (3)
      Tests  11 passed (11)
```

---

## 14. Deployment Guide (Render / Cloud)

PayPilot AI is production-ready for deployment to **Render**, **Vercel**, or **AWS**:

1. **Database:** Provision a managed PostgreSQL instance (e.g. Render PostgreSQL or Neon).
2. **Environment:** Set `DATABASE_URL` to your PostgreSQL connection string in your hosting dashboard.
3. **Build Command:** `npx prisma generate && npx prisma db push && npm run build`
4. **Start Command:** `npm start`
5. **Webhook Registration:** In your PayPal Developer Dashboard, create a webhook pointing to:  
   `https://your-domain.com/api/paypal/webhook` with events:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`

---

## 15. Judge Demo Instructions

1. Navigate to [http://localhost:3000/login](http://localhost:3000/login).
2. Click **"1-Click Launch Judge Demo"** (or log in with `merchant@paypilot.ai` / `PayPalHackathon2026!`).
3. **Explore Modules:**
   - **Command Center (`/dashboard`):** Inspect live KPIs, Recharts revenue velocity, and date filters.
   - **AI Financial Agent (`/assistant`):** Try sample prompts: *"Analyze my business payments, identify unpaid invoices, and explain my financial performance."*
   - **Sandbox Checkout (`/checkout`):** Generate a PayPal Order v2, open sandbox checkout, and capture the order with verified receipt.
   - **Smart Collections (`/invoices`):** Click "Prepare AI Reminder" on StrataFlow Tech's overdue invoice.
   - **Human Approval Center (`/approvals`):** Review the staged action and click "Approve & Execute via PayPal".
   - **Transactions (`/transactions`):** Inspect ledger records, PayPal order/capture IDs, and lifecycle events.
   - **Fraud Guard (`/fraud`):** Review active anomaly detections and investigate suspicious velocity alerts.
   - **Activity Audit (`/audit`):** Inspect the immutable system audit trail and PayPal webhook payloads.

---

## 16. Current Limitations
- Multi-party split disbursements (PayPal Marketplace platform fees) are planned for a subsequent release.
- Sandbox testing simulates buyer accounts via PayPal Sandbox buyer personas (`sb-buyer@business.example.com`).

---

## 17. Future Scope & Roadmap
- **Autonomous Multi-Tier Approvals:** Configurable approval policies based on transaction thresholds ($500 vs $5,000).
- **Automated Recurring Subscriptions:** Native integration with PayPal Subscriptions and Billing Agreements v1.
- **Forex Hedging Signals:** Multi-currency risk analysis with real-time exchange rate volatility protection.

---

## License
This project is open-source and distributed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
