# PayPilot AI — Tools and Technologies Disclosure

This document provides a transparent and detailed breakdown of every tool, SDK, platform, and framework used in the development and runtime execution of **PayPilot AI**.

---

## 1. Core Runtime Technologies

### PayPal Developer Platform
- **Purpose:** Core payment gateway infrastructure, order creation, customer checkout, server captures, refund processing, and webhook event notifications.
- **Components Used:**
  - PayPal Developer Sandbox Environment
  - PayPal Orders REST API v2 (`POST /v2/checkout/orders`, `GET /v2/checkout/orders/{id}`)
  - PayPal Capture REST API v2 (`POST /v2/checkout/orders/{id}/capture`)
  - PayPal Refund REST API v2 (`POST /v2/payments/captures/{id}/refund`)
  - PayPal Webhook Signature Verification API (`POST /v1/notifications/verify-webhook-signature`)
- **Integration Layer:** `src/lib/paypal.ts` and related API routes in `src/app/api/paypal/*`.

### OpenAI API
- **Purpose:** Natural language financial intent recognition, function calling orchestration, and structured business insights generation.
- **Components Used:**
  - OpenAI Node SDK (`openai`)
  - Tool/Function Calling interface (`tools`, `tool_choice: 'auto'`)
  - Target Model: `gpt-4o-mini`
- **Integration Layer:** `src/lib/ai/orchestrator.ts` and `src/lib/ai/tools.ts`.

### Next.js 14 (App Router)
- **Purpose:** Full-stack React web framework providing server-side API routes, optimized static generation, and responsive client layouts.
- **Integration Layer:** `src/app/*` (pages, layouts, and API route handlers).

### TypeScript
- **Purpose:** End-to-end type safety across PayPal payload schemas, Prisma database models, and API boundaries.

### Tailwind CSS & Lucide Icons
- **Purpose:** Modern, dark-navy fintech design system with electric purple and cyan accents, glassmorphic panels, and accessible typography.

### Recharts
- **Purpose:** Data visualization library powering interactive revenue velocity charts and cash flow projections.

### Prisma ORM & Database Layer
- **Purpose:** Normalized relational persistence for 14 entities (Users, Merchants, Customers, Invoices, Payments, Refunds, Approvals, Fraud Alerts, Webhooks, Audit Logs).
- **Engines:**
  - Local Zero-Config Development & Testing: SQLite (`dev.db`)
  - Production Deployment: PostgreSQL (Render / Neon / Supabase)

### Jose & BcryptJS
- **Purpose:** Cryptographic password hashing (`bcryptjs`) and secure stateless HTTP-only session token signing & verification (`jose`).

### Zod
- **Purpose:** Strict schema validation on all incoming API requests and tool invocation parameters.

---

## 2. Testing & Quality Assurance Tools

### Vitest
- **Purpose:** High-performance test runner executing unit and integration tests across Authentication, PayPal REST APIs, NVIDIA NIM AI Agent Tools, Approval Center, and Refund Lifecycle.
- **Test Results:** 27 passed across 7 test suites (`tests/auth.test.ts`, `tests/paypal.test.ts`, `tests/ai-tools.test.ts`, `tests/nvidia-nim.test.ts`, `tests/approval-center.test.ts`, `tests/refund-reporting.test.ts`, `tests/sync-and-conversations.test.ts`).

### Autonomous AI Operations Engine
- **Purpose:** Self-driving financial operations engine delivering proactive financial sweeps, automated overdue receivables collections, risk anomaly detection, real-time PayPal webhook dispute handling, and interactive agentic action cards.
- **Components Used:**
  - `src/lib/ai/sweep.ts` & `src/app/api/ai/sweep/route.ts` (Autonomous Financial Sweep Engine)
  - `src/app/assistant/page.tsx` (1-click Sweep Trigger & Interactive Agentic Action Cards)
  - `src/app/api/paypal/webhook/route.ts` (Real-time autonomous PayPal dispute/chargeback reactor)
  - `scripts/run-sweep.mjs` (CLI and Render workflow cron sweep automation)

### APIMatic Context Plugin
- **Purpose:** Official sponsor partner plugin providing instant, zero-hallucination PayPal REST v2 API schema context, parameter schemas, and cryptographic verification specs to the Autonomous AI Agent.
- **Components Used:**
  - `APIMATIC_PAYPAL_CONTEXT` schema plugin specification
  - Integrated into AI Agent orchestration prompt pipeline (`src/lib/ai/apimaticContext.ts` and `src/lib/ai/orchestrator.ts`)
  - Ensures accurate tool calling across Orders v2, Captures, and Refunds with strict idempotency guards.

### AG Grid Enterprise & Community
- **Purpose:** High-performance FinTech data virtualization, multi-column sorting, filtering, and interactive tabular UX across merchant transaction ledgers and client invoicing matrices.
- **Components Used:**
  - `ag-grid-community` & `ag-grid-react` (v36.3.0)
  - Custom dark theme styling via `@ag-theme-quartz-dark` tailored to PayPilot AI's neon-indigo FinTech aesthetic
  - Custom cell renderers for PayPal Order IDs, capture state badges, partial refund balance calculations, risk scores, and 1-click PayPal checkout triggers
  - View switcher allowing merchants and hackathon judges to seamlessly toggle between the high-speed AG Grid Data Matrix and the responsive Classic View
- **Integration Layer:** `src/app/transactions/page.tsx` and `src/app/invoices/page.tsx`.

---

## 3. Sponsor Technologies Disclosure & Evaluation

- **PayPal Developer Platform:** Core sponsor platform powering end-to-end checkout, capture, refund, and webhook verification.
- **Render:** Production deployment platform hosting containerized Next.js full-stack instance, automated database push/seed workflows, and SSL live endpoints.
- **AG Grid:** Core sponsor platform actively integrated across primary financial tables (Transactions Ledger and Smart Collections Invoicing) with custom cell renderers and quartz-dark styling.
- **APIMatic:** Sponsor plugin integrated into AI Agent prompt pipeline providing structured PayPal REST v2 schema context and idempotency rules.
- **Postman:** Used for API collection testing of PayPal Sandbox endpoints during development.

---

## 4. Development vs. Runtime Distinction
- **Development-Only Tools:** `prisma` CLI, `vitest`, `typescript`, `@types/*`, `autoprefixer`, `postcss`.
- **Runtime Dependencies:** `@prisma/client`, `next`, `react`, `react-dom`, `openai`, `jose`, `bcryptjs`, `recharts`, `lucide-react`, `zod`.
