# ApexStore AI E-commerce Support Agent (Next.js Capstone)

An enterprise-grade customer support platform built with **Next.js (App Router)**, **Google Gemini API**, **Google Sheets API v4**, and **Word (.docx)** policy ingestion.

---

## 🌟 Key Features

1. **AI Customer Support Concierge ("Eren")**:
   - Built with the official `@google/genai` SDK using `gemini-3.8-flash` with native function calling.
   - Answers pricing, availability, discounts, and promotional queries grounded directly in live catalog data.
2. **Strict Google Sheets Integration (`googleapis`)**:
   - Synchronizes 5 core sheets: `Products`, `Orders`, `Customers`, `RefundRequests`, and `InteractionsLog`.
   - Real-time order lookup, customer loyalty tier verification (Gold/Silver/Bronze perks), and session logging.
3. **Word (`.docx`) Policy Engine**:
   - Ingests and understands company return and refund rules dynamically from `data/company_policies.docx` using `mammoth`.
   - Admin UI allows uploading and re-indexing new `.docx` policy files at runtime.
4. **Human-in-the-Loop Refund Approval & Auto-Approve Toggle**:
   - AI evaluates eligibility (days since delivery, item condition, DOA, final sale exemptions).
   - Generates structured refund proposal with status `PENDING_APPROVAL`.
   - Admins can approve or reject in the Operations Hub with 1 click, or toggle **Auto-Approve** for immediate customer resolution.
5. **Automated Refund Confirmation Emails**:
   - Dispatches HTML receipts with refund reference ID, amount, and payment credit timeline (3–5 business days).
   - Works with live SMTP (Gmail, SendGrid) and includes an in-app Email Dispatcher & Log Viewer for previewing receipts.

---

## 🏗️ Architecture & Workflow

```
Customer / Browser 
       │
       ▼
Next.js Front-End (Catalog, Order Tracker, AI Chat Drawer)
       │
       ▼
API Routes (/api/chat, /api/refunds, /api/policy, /api/admin)
       │
       ├─► Google Gemini API (@google/genai)
       │         │
       │         ├─► search_products ───────────┐
       │         ├─► lookup_order ──────────────┤
       │         ├─► check_refund_policy ───────┼─► Google Sheets API (v4)
       │         ├─► evaluate_and_submit_refund ┘   (Products, Orders, Refunds)
       │         └─► log_customer_interaction
       │
       ├─► Policy Engine (mammoth) ───────────────► data/company_policies.docx
       │
       └─► Email Service (nodemailer) ────────────► Customer Email / In-App Viewer
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your API keys:
- **`GEMINI_API_KEY`**: Obtain from [Google AI Studio](https://aistudio.google.com/app/apikey).
- **`GOOGLE_SERVICE_ACCOUNT_EMAIL`**, **`GOOGLE_PRIVATE_KEY`**, **`GOOGLE_SHEET_ID`**: From your Google Cloud Service Account.

*(Note: If you run without `.env.local`, the application seamlessly falls back to realistic in-memory demo data with simulated agent tools so you can test immediately!)*

### 3. Initialize / Seed Google Sheets
Run the automated initialization script to verify tabs and write sample catalog, orders, and customer records:
```bash
npm run seed:sheets
```
*(Or click "Seed / Reset Google Sheets Data" directly inside the Admin Portal)*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Storefront, or [http://localhost:3000/admin](http://localhost:3000/admin) for the Admin Operations Hub.

---

## 🧪 Demo Test Scenarios

### Scenario A: Product Pricing & Discounts Inquiry
- **Customer asks**: *"What are your best deals and discounts right now?"*
- **Agent Action**: Calls `search_products`.
- **Expected Result**: Returns products from Google Sheets with active discounts (e.g. Apex Pulse Headphones 15% off at $169.99, Chrono Smartwatch 20% off at $199.99).

### Scenario B: Order Tracking
- **Customer asks**: *"Where is my order ORD-1001?"*
- **Agent Action**: Calls `lookup_order` for `ORD-1001`.
- **Expected Result**: Returns delivery date, item details, and status `Delivered`.

### Scenario C: Refund Evaluation (Defective on Arrival - DOA)
- **Customer asks**: *"I want a refund for ORD-1002. The smartwatch arrived with a cracked screen."*
- **Agent Action**:
  1. Looks up `ORD-1002` (delivered 12 days ago, within 14-day DOA window).
  2. Evaluates `company_policies.docx` Section 3 (DOA full refund + complimentary return shipping).
  3. Drafts refund proposal in Google Sheets with status `Pending_Admin_Review`.
  4. In Admin Portal (`/admin`), Admin clicks **Approve & Email**.
  5. Status updates in Google Sheets to `APPROVED` and automated HTML email receipt is dispatched!

### Scenario D: Policy Rejection (Expired Return Window)
- **Customer asks**: *"Can I get a refund for ORD-1003?"*
- **Agent Action**: Looks up `ORD-1003` (delivered 45 days ago, customer is Bronze tier with 30-day limit).
- **Expected Result**: Agent cites Section 2 of `company_policies.docx` and politely explains that the 30-day window has expired.
