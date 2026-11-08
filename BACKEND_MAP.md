# Backend Architecture & Symbol Index (`BACKEND_MAP.md`)

> **Last Updated**: 2026-10-30  
> **Stack**: Next.js 16 (App Router) / React 19 / TypeScript / Google GenAI SDK (`@google/genai`) / Google Sheets API (`googleapis`) / Nodemailer  
> **Root Directory**: `d:/Projects/15-Agent`

---

## 1. Entry Points & Configuration

- **Next.js App Configuration**: [`next.config.ts`](file:///d:/Projects/15-Agent/next.config.ts#L1-L7)
- **Environment & Secret Config**: [`.env`](file:///d:/Projects/15-Agent/.env) & [`.env.example`](file:///d:/Projects/15-Agent/.env.example)
  - `GEMINI_API_KEY`: API key for Google GenAI SDK
  - `GEMINI_MODEL`: Model identifier (e.g. `gemini-3.5-flash` or `gemini-2.5-flash`)
  - `GEMINI_THINKING_BUDGET`: Thinking budget for low-latency response (`0`)
  - `ADMIN_SECRET_KEY`: Shared secret key protecting administrative routes (`/api/admin`, `/api/refunds`, `/api/policy`)
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Google Service Account email for Sheets access
  - `GOOGLE_PRIVATE_KEY`: Private RSA key for Sheets JWT authentication
  - `GOOGLE_SHEET_ID`: Target Google Spreadsheet ID
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: Nodemailer SMTP delivery config
- **Package Manifest & Scripts**: [`package.json`](file:///d:/Projects/15-Agent/package.json#L5-L12)
  - `dev`: `next dev` (runs local server on `http://localhost:3000` or `http://localhost:3001`)
  - `seed:sheets`: `npx tsx scripts/seed-sheets.ts`
  - `generate:policy`: `npx tsx scripts/generate-policy-doc.ts`

---

## 2. API Routes & Endpoints

| HTTP Method | Route Path | File & Line Range | Handler Function | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/chat` | [`src/app/api/chat/route.ts#L4-L29`](file:///d:/Projects/15-Agent/src/app/api/chat/route.ts#L4-L29) | `POST(req)` | Dispatches user conversation turns to the Gemini agent or local fallback simulation engine with tool calling. |
| `GET` | `/api/admin` | [`src/app/api/admin/route.ts#L13-L41`](file:///d:/Projects/15-Agent/src/app/api/admin/route.ts#L13-L41) | `GET()` | Retrieves aggregated store metrics, sheets connection status, policy summary, refunds, interaction logs, and dispatched email receipts. |
| `POST` | `/api/admin` | [`src/app/api/admin/route.ts#L43-L66`](file:///d:/Projects/15-Agent/src/app/api/admin/route.ts#L43-L66) | `POST(req)` | Handles administrative actions: toggle automatic refund approval (`toggle_auto_approve`) or re-seed Google Sheets (`seed_sheets`). |
| `GET` | `/api/policy` | [`src/app/api/policy/route.ts#L4-L23`](file:///d:/Projects/15-Agent/src/app/api/policy/route.ts#L4-L23) | `GET(req)` | Fetches raw parsed policy text and HTML preview, or performs clause-level semantic RAG search when `?q=...` query is provided. |
| `POST` | `/api/policy` | [`src/app/api/policy/route.ts#L25-L59`](file:///d:/Projects/15-Agent/src/app/api/policy/route.ts#L25-L59) | `POST(req)` | Uploads a new Microsoft Word `.docx` file, re-indexes policy clauses into memory, and invalidates policy cache. |
| `GET` | `/api/refunds` | [`src/app/api/refunds/route.ts#L9-L16`](file:///d:/Projects/15-Agent/src/app/api/refunds/route.ts#L9-L16) | `GET()` | Retrieves all logged customer refund requests with eligibility and admin approval statuses. |
| `POST` | `/api/refunds` | [`src/app/api/refunds/route.ts#L18-L63`](file:///d:/Projects/15-Agent/src/app/api/refunds/route.ts#L18-L63) | `POST(req)` | Human-in-the-loop action endpoint to `APPROVE` or `REJECT` a refund request and automatically dispatch confirmation email. |
| `GET` | `/api/orders` | [`src/app/api/orders/route.ts#L4-L30`](file:///d:/Projects/15-Agent/src/app/api/orders/route.ts#L4-L30) | `GET(req)` | Fetches a specific order by `?orderId=...` or list of orders matching `?email=...`. |
| `GET` | `/api/products` | [`src/app/api/products/route.ts#L4-L15`](file:///d:/Projects/15-Agent/src/app/api/products/route.ts#L4-L15) | `GET(req)` | Queries the live product catalog by `?query=...` and/or `?category=...`. |

---

## 3. Services & Business Logic

### `src/lib/adminAuth.ts`
- [`requireAdminKey(req: NextRequest): NextResponse | null`](file:///d:/Projects/15-Agent/src/lib/adminAuth.ts#L8-L23)
  - **Purpose**: Authenticates administrative requests against `ADMIN_SECRET_KEY` via `x-admin-key` header or `?adminKey=` query parameter. In local development, safely falls back when key is unset.

### `src/lib/gemini.ts`
- [`sanitizePaymentMethod(method?: string): string`](file:///d:/Projects/15-Agent/src/lib/gemini.ts#L18-L24)
  - **Purpose**: Strips trailing 4-digit card numbers (e.g. `ending 8819`) to prevent customer payment card exposure.
- [`extractCardLast4(method?: string): string | null`](file:///d:/Projects/15-Agent/src/lib/gemini.ts#L29-L33)
  - **Purpose**: Extracts card digits for two-factor verification challenges without exposing them.
- [`runtimeSettings`](file:///d:/Projects/15-Agent/src/lib/gemini.ts#L36-L38)
  - **Purpose**: In-memory state holding `autoApproveRefunds` toggle.
- [`toolsDeclarations`](file:///d:/Projects/15-Agent/src/lib/gemini.ts#L41-L115)
  - **Purpose**: Declarations for Gemini tools: `search_products`, `lookup_order`, `check_refund_policy`, `evaluate_and_submit_refund`.
- [`executeTool(name: string, args: any): Promise<any>`](file:///d:/Projects/15-Agent/src/lib/gemini.ts#L120-L318)
  - **Purpose**: Dispatches tool executions to Google Sheets, Clause-Level RAG engine, and email service.
  - **Dependencies**: `searchProducts`, `getOrderById`, `getCustomerByEmail`, `searchPolicyRAG`, `createRefundRequest`, `sendRefundConfirmationEmail`.
- [`processChatWithAgent(params)`: `Promise<{ reply, toolCalls, refundData? }>`](file:///d:/Projects/15-Agent/src/lib/gemini.ts#L323-L457)
  - **Purpose**: Core conversational handler using Google GenAI SDK (`GoogleGenAI`), running multi-turn tool loops up to 5 iterations.
- [`simulateAgentResponse(messages, customerEmail)`](file:///d:/Projects/15-Agent/src/lib/gemini.ts#L462-L719)
  - **Purpose**: Offline/fallback simulation engine preserving multi-turn conversation memory, customer authentication, 2FA challenge flow, and policy evaluation.
- [`extractOrder(text: string): string | null`](file:///d:/Projects/15-Agent/src/lib/gemini.ts#L501-L510)
  - **Purpose**: Flexible parser extracting Order IDs across varied user patterns (`order 1049`, `ORD-1049`, `#1049`, `1049`).

### `src/lib/googleSheets.ts`
- [`getSheetsClient()`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L34-L72)
  - **Purpose**: Authenticates JWT client via service account email & private key to access Google Sheets v4 API.
- [`isGoogleSheetsConfigured(): boolean`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L74-L77)
  - **Purpose**: Checks whether credentials and Sheet ID are populated in the environment.
- [`checkGoogleSheetsConnection(): Promise<{ connected, sheetTitle?, sheetId?, error? }>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L84-L126)
  - **Purpose**: Performs cached (30s TTL) probe of Google Sheets API to test spreadsheet connectivity and fetch sheet title.
- [`seedGoogleSheets(): Promise<{ success, message }>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L131-L311)
  - **Purpose**: Creates the 5 required tabs (`Products`, `Orders`, `Customers`, `RefundRequests`, `InteractionsLog`) and populates headers and initial rows.
- [`getProducts(forceRefresh = false): Promise<Product[]>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L319-L353)
  - **Purpose**: Fetches product inventory from Google Sheets `Products!A2:H` with 60s in-memory caching and fallback.
- [`searchProducts(query?, category?): Promise<Product[]>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L355-L366)
  - **Purpose**: Filters cached product catalog by search keywords and/or category.
- [`getOrderById(orderId: string): Promise<Order | null>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L368-L401)
  - **Purpose**: Looks up order by primary ID from `Orders!A2:K` or fallback memory store.
- [`getOrdersByCustomer(email: string): Promise<Order[]>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L403-L434)
  - **Purpose**: Retrieves all orders associated with a customer email.
- [`findOrdersByCustomerNameOrEmail(searchTerm: string): Promise<Order[]>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L436-L482)
  - **Purpose**: Performs substring matching on customer name and email to support account lookups.
- [`getCustomerByEmail(email: string): Promise<Customer | null>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L485-L511)
  - **Purpose**: Retrieves customer profile and loyalty tier (`Gold`, `Silver`, `Bronze`) from `Customers!A2:E`.
- [`getRefundRequests(): Promise<RefundRequest[]>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L513-L540)
  - **Purpose**: Fetches all logged refund submissions from `RefundRequests!A2:K`.
- [`createRefundRequest(refund): Promise<RefundRequest>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L542-L587)
  - **Purpose**: Generates reference ID (`REF-YYYY-XXXX`), appends row to Google Sheets, and updates in-memory list.
- [`updateRefundStatus(refundId, newAdminStatus): Promise<{ success, refund?, error? }>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L589-L638)
  - **Purpose**: Updates row status (`APPROVED` or `REJECTED`) and timestamps in Google Sheets and memory.
- [`logCustomerInteraction(log): Promise<void>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L640-L676)
  - **Purpose**: Appends timestamped customer query, agent response, and tool calls to `InteractionsLog!A:F`.
- [`getInteractionsLog(): Promise<InteractionLog[]>`](file:///d:/Projects/15-Agent/src/lib/googleSheets.ts#L678-L702)
  - **Purpose**: Fetches customer chat audit logs from `InteractionsLog!A2:F`.

### `src/lib/policies.ts`
- [`chunkPolicies(rawText: string): PolicyClause[]`](file:///d:/Projects/15-Agent/src/lib/policies.ts#L29-L113)
  - **Purpose**: Splits policy text into primary sections (`SEC-1`, `SEC-2`, etc.) and granular sub-clauses (`SEC-2.1`, `SEC-3.3`).
- [`getCompanyPolicies(): Promise<{ text, html, clauses, lastUpdated }>`](file:///d:/Projects/15-Agent/src/lib/policies.ts#L118-L170)
  - **Purpose**: Uses `mammoth` to extract raw text and HTML from `data/company_policies.docx` with mtime-based caching.
- [`COMMON_STOPWORDS`](file:///d:/Projects/15-Agent/src/lib/policies.ts#L173-L177)
  - **Purpose**: Stopword blacklist for inverse document frequency (IDF) scoring.
- [`searchPolicyRAG(query: string, maxResults = 3): Promise<PolicyClause[]>`](file:///d:/Projects/15-Agent/src/lib/policies.ts#L183-L266)
  - **Purpose**: Clause-level semantic RAG retriever combining exact phrase matching, IDF token weighting, and confidence calculation.
- [`verifyPolicyGrounding(claimText: string, sectionId?: string)`](file:///d:/Projects/15-Agent/src/lib/policies.ts#L272-L322)
  - **Purpose**: Strict guardrail validator assessing whether an agent claim or refund decision has matching backing clauses.
- [`updatePolicyDocument(buffer: Buffer): Promise<{ success, error? }>`](file:///d:/Projects/15-Agent/src/lib/policies.ts#L327-L349)
  - **Purpose**: Writes new `.docx` buffer to `data/company_policies.docx` and invalidates in-memory caches.

### `src/lib/email.ts`
- [`generateRefundEmailHtml(params): string`](file:///d:/Projects/15-Agent/src/lib/email.ts#L22-L110)
  - **Purpose**: Constructs an executive HTML receipt template with order, refund ID, amount, and payout timeline details.
- [`sendRefundConfirmationEmail(params): Promise<{ success, messageId?, mode }>`](file:///d:/Projects/15-Agent/src/lib/email.ts#L115-L188)
  - **Purpose**: Sends email via Nodemailer SMTP if credentials exist in `.env`, or stores to local dispatch log for Admin inspection.
- [`getDispatchedEmails(): SentEmailRecord[]`](file:///d:/Projects/15-Agent/src/lib/email.ts#L190-L192)
  - **Purpose**: Returns all dispatched or logged email receipts.

---

## 4. Database Models & Schemas

### [`src/lib/sampleData.ts`](file:///d:/Projects/15-Agent/src/lib/sampleData.ts)

- **Interface**: [`Product`](file:///d:/Projects/15-Agent/src/lib/sampleData.ts#L1-L10)
  - **Fields**: `id: string`, `name: string`, `category: string`, `price: number`, `discountPercent: number`, `stockQuantity: number`, `description: string`, `eligibleForRefund: boolean`
- **Interface**: [`Order`](file:///d:/Projects/15-Agent/src/lib/sampleData.ts#L12-L24)
  - **Fields**: `orderId: string`, `customerEmail: string`, `customerName: string`, `orderDate: string`, `deliveryDate: string`, `productId: string`, `productName: string`, `quantity: number`, `totalAmount: number`, `paymentMethod: string`, `orderStatus: "Delivered" | "Shipped" | "Processing" | "Cancelled"`
- **Interface**: [`Customer`](file:///d:/Projects/15-Agent/src/lib/sampleData.ts#L26-L32)
  - **Fields**: `customerId: string`, `name: string`, `email: string`, `loyaltyTier: "Gold" | "Silver" | "Bronze"`, `registeredDate: string`
- **Interface**: [`RefundRequest`](file:///d:/Projects/15-Agent/src/lib/sampleData.ts#L34-L46)
  - **Fields**: `refundId: string`, `orderId: string`, `customerEmail: string`, `productId: string`, `refundAmount: number`, `reason: string`, `policyCitation: string`, `eligibilityStatus: "Approved" | "Pending_Admin_Review" | "Rejected"`, `adminStatus: "PENDING" | "APPROVED" | "REJECTED"`, `createdAt: string`, `approvedAt: string`
- **Interface**: [`InteractionLog`](file:///d:/Projects/15-Agent/src/lib/sampleData.ts#L48-L55)
  - **Fields**: `interactionId: string`, `timestamp: string`, `customerEmail: string`, `customerQuery: string`, `agentResponse: string`, `toolCallsUsed: string`
- **Interface**: [`PolicyClause`](file:///d:/Projects/15-Agent/src/lib/policies.ts#L13-L24)
  - **Fields**: `sectionId: string`, `parentSection?: string`, `title: string`, `isParent: boolean`, `content: string`, `summary: string`, `keywords: string[]`, `relevanceScore?: number`, `matchConfidence?: "HIGH" | "MEDIUM" | "LOW"`, `matchedTokens?: string[]`
- **Interface**: [`SentEmailRecord`](file:///d:/Projects/15-Agent/src/lib/email.ts#L3-L14)
  - **Fields**: `id: string`, `recipient: string`, `subject: string`, `refundId: string`, `orderId: string`, `amount: number`, `htmlContent: string`, `sentAt: string`, `status: "DELIVERED" | "TEST_DISPATCHED" | "FAILED"`, `transportInfo: string`

---

## 5. Utilities, Seeds & Tooling Scripts

- [`getIsoDateDaysAgo(daysAgo: number): string`](file:///d:/Projects/15-Agent/src/lib/sampleData.ts#L141-L145)
  - Utility to generate realistic relative ISO dates for simulated orders.
- [`scripts/seed-sheets.ts`](file:///d:/Projects/15-Agent/scripts/seed-sheets.ts#L1-L40)
  - Standalone CLI runner to test Google Sheets API connection and batch-initialize the 5 sheet tabs.
- [`scripts/generate-policy-doc.ts`](file:///d:/Projects/15-Agent/scripts/generate-policy-doc.ts#L1-L212)
  - Programmatic docx builder generating `data/company_policies.docx` containing the 21 granular return policy clauses.
- [`scripts/generate-50-orders.ts`](file:///d:/Projects/15-Agent/scripts/generate-50-orders.ts#L1-L112)
  - Script for populating 50 randomized realistic customer orders across 20 customer personas.

