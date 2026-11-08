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
- **Purpose:** High-performance test runner executing unit and integration tests across Authentication, PayPal REST APIs, and AI Agent Tools.
- **Test Results:** 11 passed across 3 test suites (`tests/auth.test.ts`, `tests/paypal.test.ts`, `tests/ai-tools.test.ts`).

---

## 3. Sponsor Technologies Disclosure & Evaluation

- **Render:** Target hosting platform for production deployment, supporting containerized Next.js and managed PostgreSQL.
- **AG Grid:** Evaluated for transaction table virtualization. A lightweight responsive Tailwind table was chosen for optimal mobile loading speeds and zero external licensing overhead.
- **Postman:** Used for API collection testing of PayPal Sandbox endpoints during development.

---

## 4. Development vs. Runtime Distinction
- **Development-Only Tools:** `prisma` CLI, `vitest`, `typescript`, `@types/*`, `autoprefixer`, `postcss`.
- **Runtime Dependencies:** `@prisma/client`, `next`, `react`, `react-dom`, `openai`, `jose`, `bcryptjs`, `recharts`, `lucide-react`, `zod`.
