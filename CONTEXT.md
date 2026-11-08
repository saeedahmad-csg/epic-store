# ApexStore AI Support Agent — Project Context & Handoff (`CONTEXT.md`)

> **Status:** All core systems, live integrations, Clause-Level RAG, Grounding Guardrails, Privacy Protections, and Admin Auto-Sync are **100% COMPLETE, TESTED & ACTIVE**.  
> **Last Updated:** October 22, 2026  
> **Active Dev Server:** `http://localhost:3001`  
> **Active Background Server Task:** `094b328a-d5d4-44da-8beb-8ff66b805ebc/task-17`

---

## 1. Project Overview & Identity
- **Store Name:** **ApexStore** (Modern E-commerce Electronics & Peripherals)
- **AI Concierge Name:** **Eren** (Customer Support & Operations Agent)
- **Primary Model:** **`gemini-flash-lite-latest`** (Google GenAI SDK)
- **Thinking Configuration:** Explicit Zero Thinking Budget (`GEMINI_THINKING_BUDGET=0`) for instant chat response latency.
- **Frontend Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti.

---

## 2. Recent Upgrades & Bugs Resolved (Session Summary)

### A. Flexible Order ID Parser (`order 1049` Fix)
- **Issue:** Typing informal order strings like `order 1049`, `1049`, `#1049`, or `ord 1049` failed strict `/ORD-\d{4}/` regex matching, causing the agent to fall back to older IDs (`ORD-1001`) stored in conversation history.
- **Fix:** Implemented `extractOrder` parser in `src/lib/gemini.ts` supporting:
  - `order 1049` &rarr; `ORD-1049`
  - `order #1049` &rarr; `ORD-1049`
  - `ORD-1049` / `ord 1049` &rarr; `ORD-1049`
  - `#1049` &rarr; `ORD-1049`
  - Standalone `1049` &rarr; `ORD-1049`

### B. Name Extraction Regex Isolation ("our company" Bug Fix)
- **Issue:** Assistant greetings containing phrases like *"under our company policy"* triggered a loose `under\s+([A-Za-z]+)` match across `allConversationText`, falsely detecting the customer's name as `"our company"` and triggering inappropriate 2FA challenge screens.
- **Fix:**
  - Scoped entity extraction **exclusively to user messages** (`allUserText`), strictly excluding assistant utterances.
  - Added a stop-word blacklist (`our`, `the`, `company`, `policy`, `store`, `order`, etc.) preventing system keywords from ever being captured as customer names.

### C. Payment Card Number Sanitization & Privacy
- **Directive:** Eren must **never** print or echo credit card numbers (e.g. `ending 8819`).
- **Implementation:**
  - Added `sanitizePaymentMethod()` in `src/lib/gemini.ts` to convert `Credit Card (Mastercard ending 8819)` &rarr; `Credit Card (Mastercard)`.
  - Added `extractCardLast4()` so Eren can accept the last 4 digits from the user solely for 2-factor verification without echoing them back.
  - Fixed regex collision where order digits (`1001` in `ORD-1001`) were mistakenly captured as card numbers.

### D. Conciseness & Chip Precision
- **Greeting:** Eren's welcome message simplified to a clean, crisp 2-liner:
  > *"👋 Hi! I'm **Eren**, your ApexStore Concierge. How can I help you today? You can ask me to **track an order**, check **current deals**, or verify **refund eligibility**."*
- **Chip Corrections:**
  - `Refund ORD-1003`: Points correctly to the cracked-screen smartwatch (`ORD-1003`), replacing the digital gift card (`ORD-1002`).
  - Shortened deals, tracking, earbuds, and gold tier prompt chips.

### E. Admin Dashboard Google Sheets Auto-Sync
- **Write Latency:** Immediate (sub-second, ~300ms–800ms directly to Google Sheets API).
- **Read Latency:** Configured with a default **3-second background auto-sync** (the minimum safe interval without hitting Google's 60 req/min user quota limit).
- **UI Indicator:** Live pulsing badge in Admin Header (`🟢 Sheets Sync: 3s (Min)`) with interval selector (3s, 5s, 10s, Paused).
- **Cache Optimization:** Added 30-second TTL cache for `checkGoogleSheetsConnection()` to avoid redundant `spreadsheets.get` round-trips.

---

## 3. Clause-Level RAG Engine & Grounding Directives
Grounded directly in `data/company_policies.docx` parsed into 21 granular clauses:
- `SEC-2.1`: Electronics (30-day window)
- `SEC-2.2`: Opened Accessories (14-day window)
- `SEC-2.3`: Clearance & Final Sale (Non-refundable unless DOA)
- `SEC-2.4`: Loyalty Tiers (Apex Gold 45-day extension; Silver waived restocking)
- `SEC-3.1`: Defective on Arrival (DOA) (100% full refund + free return shipping label)
- `SEC-3.2`: Unopened / Change of Mind (100% refund in original packaging)
- `SEC-3.3`: Opened Goods ($5.00 restocking fee; waived for Gold Tier)
- `SEC-3.4`: Accidental Damage & Spills (Strictly ineligible)
- `SEC-4.1`: Digital Gift Cards & Software Keys (Strictly non-refundable, no DOA exception)
- `SEC-4.2`: Personal Hygiene Electronics (In-ear earbuds non-refundable once seal is broken)

---

## 4. Google Sheets Database Details
- **Spreadsheet Title:** Apex Store Data
- **Spreadsheet URL:** [Open Google Sheet](https://docs.google.com/spreadsheets/d/13PkJtBxJRdNr6JYy2m-isoBwSBztLNKjAKa_wWwttFQ/edit)
- **Spreadsheet ID:** `13PkJtBxJRdNr6JYy2m-isoBwSBztLNKjAKa_wWwttFQ`
- **Service Account:** `eren-69@gen-lang-client-0764638400.iam.gserviceaccount.com`
- **Live Tabs:**
  1. `Products` (10 catalog items with stock & discounts)
  2. `Orders` (50 seeded orders: `ORD-1001` to `ORD-1050`)
  3. `Customers` (Bronze, Silver, Gold loyalty members)
  4. `RefundRequests` (All submissions, eligibility status, admin approvals, citations)
  5. `InteractionsLog` (Complete timestamped audit trail of customer chat queries)

---

## 5. Project Directory Map
```
d:/Projects/15-Agent/
├── .env                          # API keys, Gemini model config, Google SA credentials
├── CONTEXT.md                    # This persistent state & handoff document
├── data/
│   └── company_policies.docx     # Official Word document policy source
├── src/
│   ├── app/
│   │   ├── page.tsx              # Storefront catalog, hero, deals, and order tracker
│   │   ├── admin/
│   │   │   └── page.tsx          # Operations Hub with 3s live auto-sync & RAG Explorer
│   │   └── api/
│   │       ├── chat/route.ts     # Customer chat endpoint
│   │       ├── admin/route.ts    # Admin dashboard data & settings API
│   │       ├── policy/route.ts   # Clause-level RAG semantic search & .docx upload API
│   │       └── refunds/route.ts  # Human-in-the-loop refund approval & email dispatcher
│   ├── components/
│   │   ├── ChatWidget.tsx        # Floating AI chat drawer with grounding badges
│   │   ├── Navbar.tsx            # Navigation bar
│   │   └── OrderTrackerModal.tsx # Order lookup modal
│   └── lib/
│       ├── gemini.ts             # Agent system instructions, tool execution loop & simulation
│       ├── googleSheets.ts       # Google Sheets API connector & 50-order dataset
│       ├── policies.ts           # 21-clause chunking & IDF semantic RAG retriever
│       ├── email.ts              # Automated HTML refund confirmation dispatcher
│       └── sampleData.ts         # In-memory datasets & typings
```

---

## 6. Next Task Pending (Deferred by User Request)
- **Live Gmail SMTP Integration:**
  - Create/configure a dedicated demo email (`apexstore.demo@gmail.com`) with an App Password in `.env` to send real outgoing emails to customer inboxes upon refund approval.
  - Currently, emails generate rich HTML receipts archived and viewable under the **Email Receipts** tab in `/admin`.

---

## 7. How to Resume
When you come back, run:
```bash
# Start dev server if not already running
npm run dev

# Customer Storefront:
# http://localhost:3001

# Admin Operations Hub:
# http://localhost:3001/admin
```
All state and fixes are safely saved and operational. Have a great break!
