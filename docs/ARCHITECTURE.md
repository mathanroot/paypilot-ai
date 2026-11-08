# PayPilot AI — System Architecture & Design Specification

## Executive Overview
PayPilot AI is an autonomous financial operations platform designed to bridge large language models and merchant payment infrastructure. Rather than functioning as a passive chatbot, PayPilot AI acts as an **Agentic Financial Operator** capable of auditing ledgers, creating genuine PayPal Checkout orders, chasing overdue invoices, and orchestrating customer refunds—all bounded by a **Human Approval Center**.

---

## High-Level Architecture Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Merchant User Interface                         │
│   (Next.js 14 App Router, Tailwind CSS, Lucide Icons, Recharts)         │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ HTTPS / REST / Session Cookie
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Next.js API Gateway Layer                          │
│     Authentication (jose/bcrypt) │ Input Validation (Zod)              │
└──────────────┬──────────────────┴───────────────────┬──────────────────┘
               │                                      │
               ▼                                      ▼
┌───────────────────────────────┐      ┌─────────────────────────────────┐
│     AI Agent Orchestration    │      │    PayPal Developer Gateway     │
│   - OpenAI Function Calling   │      │   - Orders API v2               │
│   - 12 Backend AI Tools       │◄────►│   - Capture API v2              │
│   - Semantic Tool Dispatcher  │      │   - Refund API v2               │
│   - Human Approval Interceptor│      │   - Webhooks Signature Verifier │
└──────────────┬────────────────┘      └────────────────┬────────────────┘
               │                                        │
               ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Prisma ORM Ledger Layer                         │
│   (SQLite Local Zero-Config / PostgreSQL Production on Render / Neon)   │
│   - Users, Merchants, Customers, Products, Payments, PaymentEvents     │
│   - Invoices, Refunds, AIActivityLogs, ApprovalRequests, FraudAlerts   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## AI Agent Decision & Human-in-the-Loop Loop

```
User Prompt
    │
    ▼
OpenAI Intent Recognition (Structured Output / Function Calling)
    │
    ▼
Tool Selection (e.g. `prepare_payment_reminder`, `create_refund`, `create_paypal_order`)
    │
    ▼
Backend Context & Safety Validation
    │
    ├── Is it read-only? (e.g. `get_revenue_summary`, `get_transactions`)
    │       └── Direct execution against Prisma Ledger -> Return verified response
    │
    └── Is it sensitive? (e.g. `create_refund`, `send_reminder`, `high_value_capture`)
            └── Stage into `ApprovalRequest` entity (Status: PENDING)
                    │
                    ▼
            Merchant Review in Human Approval Center
                    │
                    ├── APPROVED ──► Execute against PayPal REST API v2 ──► Update Ledger
                    │
                    └── REJECTED ──► Cancel operation ──► Log in Audit Trail
```

---

## 12 Implemented Backend AI Tools

| Tool Name | Scope | Underlying Action |
|:---|:---|:---|
| `get_transactions` | Read | Retrieves filtered merchant transaction ledger with customer data |
| `get_payment_details` | Read | Queries internal payment and PayPal lifecycle events |
| `get_revenue_summary` | Read | Computes GMV, net revenue, refund ratio, and receivables |
| `get_pending_invoices` | Read | Identifies overdue accounts requiring collection action |
| `create_paypal_order` | Write | Invokes PayPal Orders v2 (`/v2/checkout/orders`, intent: CAPTURE) |
| `capture_paypal_order` | Write | Invokes PayPal Capture v2 with idempotency protection |
| `create_refund` | Write | Validates eligibility and stages refund into Approval Center |
| `analyze_refund_patterns` | Read | Audits return frequency and customer LTV ratios |
| `detect_transaction_anomalies`| Read | Runs deterministic risk heuristics (velocity, cart deviations) |
| `prepare_payment_reminder` | Write | Drafts diplomatic collection email with direct PayPal link |
| `generate_financial_report`| Read | Synthesizes cash conversion cycle and executive metrics |
| `get_customer_payment_history`| Read | Aggregates customer payment reliability and lifetime revenue |

---

## PayPal Sandbox Integration Surface
- **Base Endpoint:** `https://api-m.sandbox.paypal.com`
- **Authentication:** OAuth2 Client Credentials (`/v1/oauth2/token`) with token expiration caching.
- **Orders v2:** `/v2/checkout/orders` with `intent: 'CAPTURE'`, custom reference IDs, and application context.
- **Captures v2:** `/v2/checkout/orders/{id}/capture` with `PayPal-Request-Id` idempotency header.
- **Refunds v2:** `/v2/payments/captures/{capture_id}/refund` validating original capture status and prior partial refunds.
- **Webhooks:** `/v1/notifications/verify-webhook-signature` using HMAC-SHA256 / RSA cryptographic validation.
