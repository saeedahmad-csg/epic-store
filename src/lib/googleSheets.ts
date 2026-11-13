import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import { google } from "googleapis";
import {
  Product,
  Order,
  Customer,
  RefundRequest,
  InteractionLog,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_CUSTOMERS,
  INITIAL_REFUNDS,
} from "./sampleData";

const DATA_DIR = path.join(process.cwd(), "data");
const REFUNDS_FILE = path.join(DATA_DIR, "refunds_store.json");

function loadDurableRefunds(): RefundRequest[] {
  try {
    if (fs.existsSync(REFUNDS_FILE)) {
      const raw = fs.readFileSync(REFUNDS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read durable refunds store:", err);
  }
  return [...INITIAL_REFUNDS];
}

function saveDurableRefunds(refunds: RefundRequest[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${REFUNDS_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(refunds, null, 2), "utf-8");
    fs.renameSync(tempFile, REFUNDS_FILE);
  } catch (err) {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch {}
    console.error("Failed to atomically write durable refunds store:", err);
    throw new Error("Durable storage write failure: unable to persist refund data.");
  }
}

// Local in-memory store for fallback & caching (seeded from durable on-disk store)
let memoryProducts: Product[] = [...INITIAL_PRODUCTS];
let memoryOrders: Order[] = [...INITIAL_ORDERS];
let memoryCustomers: Customer[] = [...INITIAL_CUSTOMERS];
let memoryRefunds: RefundRequest[] = loadDurableRefunds();
let memoryInteractions: InteractionLog[] = [
  {
    interactionId: "INT-101",
    timestamp: new Date().toISOString(),
    customerEmail: "sarah.connor@example.com",
    customerQuery: "Is there a discount on the wireless headphones?",
    agentResponse:
      "Yes! The Apex Pulse ANC Wireless Headphones are currently 15% off at $169.99 (reduced from $199.99).",
    toolCallsUsed: "search_products",
  },
];

// Helper to get Google Sheets API client
function getSheetsClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  // Check service account credentials
  if (!privateKey || privateKey.includes("...") || !email) {
    try {
      const specificKeyPath = path.join(process.cwd(), "gen-lang-client-0764638400-40c560802081.json");
      if (fs.existsSync(specificKeyPath)) {
        const keyData = JSON.parse(fs.readFileSync(specificKeyPath, "utf8"));
        if (keyData.client_email && keyData.private_key) {
          email = keyData.client_email;
          privateKey = keyData.private_key;
        }
      }
    } catch (e) {
      console.warn("Could not load service account JSON file:", e);
    }
  }

  if (!email || !privateKey || !sheetId || sheetId === "your-google-sheet-id") {
    return null;
  }

  // Handle escaped newlines in env variables
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    sheetId,
  };
}

export function isGoogleSheetsConfigured(): boolean {
  const client = getSheetsClient();
  return client !== null;
}

let cachedConnectionResult: {
  result: { connected: boolean; sheetTitle?: string; sheetId?: string; error?: string };
  cachedAt: number;
} | null = null;

export async function checkGoogleSheetsConnection(): Promise<{
  connected: boolean;
  sheetTitle?: string;
  sheetId?: string;
  error?: string;
}> {
  if (cachedConnectionResult && Date.now() - cachedConnectionResult.cachedAt < 30000) {
    return cachedConnectionResult.result;
  }

  const client = getSheetsClient();
  if (!client) {
    const res = {
      connected: false,
      error:
        "Google Sheets credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID in .env.local",
    };
    cachedConnectionResult = { result: res, cachedAt: Date.now() };
    return res;
  }

  try {
    const res = await client.sheets.spreadsheets.get({
      spreadsheetId: client.sheetId,
    });
    const result = {
      connected: true,
      sheetTitle: res.data.properties?.title || "Untitled Spreadsheet",
      sheetId: client.sheetId,
    };
    cachedConnectionResult = { result, cachedAt: Date.now() };
    return result;
  } catch (err: any) {
    console.error("Google Sheets connection test failed:", err);
    const result = {
      connected: false,
      sheetId: client.sheetId,
      error: err.message || "Failed to connect to Google Sheets",
    };
    cachedConnectionResult = { result, cachedAt: Date.now() };
    return result;
  }
}

/**
 * Ensures required tabs exist and seeds sample data into Google Sheets
 */
export async function seedGoogleSheets(): Promise<{ success: boolean; message: string }> {
  const client = getSheetsClient();
  if (!client) {
    // If not configured, ensure memory store is reset to initial
    memoryProducts = [...INITIAL_PRODUCTS];
    memoryOrders = [...INITIAL_ORDERS];
    memoryCustomers = [...INITIAL_CUSTOMERS];
    memoryRefunds = [...INITIAL_REFUNDS];
    return {
      success: true,
      message: "Seeded sample data to in-memory store (Google Sheets credentials not yet set in .env.local).",
    };
  }

  try {
    const { sheets, sheetId } = client;

    // 1. Get current spreadsheet sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingSheets = (spreadsheet.data.sheets || []).map((s) => s.properties?.title);

    const requiredTabs = ["Products", "Orders", "Customers", "RefundRequests", "InteractionsLog"];
    const addSheetRequests: any[] = [];

    for (const tab of requiredTabs) {
      if (!existingSheets.includes(tab)) {
        addSheetRequests.push({
          addSheet: {
            properties: { title: tab },
          },
        });
      }
    }

    if (addSheetRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: addSheetRequests },
      });
    }

    // 2. Populate Headers & Rows
    // Products
    const productsRows = [
      ["ID", "Name", "Category", "Price", "DiscountPercent", "StockQuantity", "Description", "EligibleForRefund"],
      ...INITIAL_PRODUCTS.map((p) => [
        p.id,
        p.name,
        p.category,
        p.price.toString(),
        p.discountPercent.toString(),
        p.stockQuantity.toString(),
        p.description,
        p.eligibleForRefund ? "TRUE" : "FALSE",
      ]),
    ];

    // Orders
    const ordersRows = [
      [
        "OrderID",
        "CustomerEmail",
        "CustomerName",
        "OrderDate",
        "DeliveryDate",
        "ProductID",
        "ProductName",
        "Quantity",
        "TotalAmount",
        "PaymentMethod",
        "OrderStatus",
      ],
      ...INITIAL_ORDERS.map((o) => [
        o.orderId,
        o.customerEmail,
        o.customerName,
        o.orderDate,
        o.deliveryDate,
        o.productId,
        o.productName,
        o.quantity.toString(),
        o.totalAmount.toString(),
        o.paymentMethod,
        o.orderStatus,
      ]),
    ];

    // Customers
    const customersRows = [
      ["CustomerID", "Name", "Email", "LoyaltyTier", "RegisteredDate"],
      ...INITIAL_CUSTOMERS.map((c) => [c.customerId, c.name, c.email, c.loyaltyTier, c.registeredDate]),
    ];

    // Refund Requests
    const refundRows = [
      [
        "RefundID",
        "OrderID",
        "CustomerEmail",
        "ProductID",
        "RefundAmount",
        "Reason",
        "PolicyCitation",
        "EligibilityStatus",
        "AdminStatus",
        "CreatedAt",
        "ApprovedAt",
      ],
      ...INITIAL_REFUNDS.map((r) => [
        r.refundId,
        r.orderId,
        r.customerEmail,
        r.productId,
        r.refundAmount.toString(),
        r.reason,
        r.policyCitation,
        r.eligibilityStatus,
        r.adminStatus,
        r.createdAt,
        r.approvedAt,
      ]),
    ];

    // Interactions Log
    const interactionRows = [
      ["InteractionID", "Timestamp", "CustomerEmail", "CustomerQuery", "AgentResponse", "ToolCallsUsed"],
      ...memoryInteractions.map((i) => [
        i.interactionId,
        i.timestamp,
        i.customerEmail,
        i.customerQuery,
        i.agentResponse,
        i.toolCallsUsed,
      ]),
    ];

    await Promise.all([
      sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Products!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: productsRows },
      }),
      sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Orders!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: ordersRows },
      }),
      sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Customers!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: customersRows },
      }),
      sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "RefundRequests!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: refundRows },
      }),
      sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "InteractionsLog!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: interactionRows },
      }),
    ]);

    cachedProductsResult = null;
    cachedOrdersResult = null;
    cachedCustomersResult = null;

    return {
      success: true,
      message: `Successfully initialized and seeded all 5 tabs in Google Sheet ${sheetId}!`,
    };
  } catch (err: any) {
    console.error("Error seeding Google Sheets:", err);
    return {
      success: false,
      message: err.message || "Failed to seed Google Sheets",
    };
  }
}

// -------------------------------------------------------------
// Data Access Methods (with Google Sheets + memory fallback)
// -------------------------------------------------------------
// CACHED READ OPERATIONS (30-60s TTL for sub-10ms tool lookup)
// -------------------------------------------------------------

let cachedProductsResult: { products: Product[]; cachedAt: number } | null = null;
let cachedOrdersResult: { orders: Order[]; cachedAt: number } | null = null;
let cachedCustomersResult: { customers: Customer[]; cachedAt: number } | null = null;

export async function getProducts(forceRefresh = false): Promise<Product[]> {
  if (!forceRefresh && cachedProductsResult && Date.now() - cachedProductsResult.cachedAt < 60000) {
    return cachedProductsResult.products;
  }

  const client = getSheetsClient();
  if (!client) return memoryProducts;

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "Products!A2:I",
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return memoryProducts;

    const products = rows.map((row) => {
      const id = row[0] || "";
      const fallbackProd = INITIAL_PRODUCTS.find((p) => p.id === id);
      return {
        id,
        name: row[1] || "",
        category: row[2] || "",
        price: parseFloat(row[3]) || 0,
        discountPercent: parseFloat(row[4]) || 0,
        stockQuantity: parseInt(row[5], 10) || 0,
        description: row[6] || "",
        eligibleForRefund: row[7]?.toUpperCase() === "TRUE",
        imageUrl: row[8] || fallbackProd?.imageUrl,
      };
    });

    cachedProductsResult = { products, cachedAt: Date.now() };
    return products;
  } catch (err) {
    console.warn("Could not fetch Products from Google Sheets, using memory fallback:", err);
    return memoryProducts;
  }
}

export async function getAllOrders(forceRefresh = false): Promise<Order[]> {
  if (!forceRefresh && cachedOrdersResult && Date.now() - cachedOrdersResult.cachedAt < 30000) {
    return cachedOrdersResult.orders;
  }

  const client = getSheetsClient();
  if (!client) return memoryOrders;

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "Orders!A2:K",
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return memoryOrders;

    const orders: Order[] = rows.map((r) => ({
      orderId: r[0] || "",
      customerEmail: r[1] || "",
      customerName: r[2] || "",
      orderDate: r[3] || "",
      deliveryDate: r[4] || "",
      productId: r[5] || "",
      productName: r[6] || "",
      quantity: parseInt(r[7], 10) || 1,
      totalAmount: parseFloat(r[8]) || 0,
      paymentMethod: r[9] || "",
      orderStatus: (r[10] as Order["orderStatus"]) || "Delivered",
    }));

    cachedOrdersResult = { orders, cachedAt: Date.now() };
    return orders;
  } catch (err) {
    console.warn("Could not fetch Orders from Google Sheets, using memory fallback:", err);
    return memoryOrders;
  }
}

export async function getAllCustomers(forceRefresh = false): Promise<Customer[]> {
  if (!forceRefresh && cachedCustomersResult && Date.now() - cachedCustomersResult.cachedAt < 30000) {
    return cachedCustomersResult.customers;
  }

  const client = getSheetsClient();
  if (!client) return memoryCustomers;

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "Customers!A2:E",
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return memoryCustomers;

    const customers: Customer[] = rows.map((r) => ({
      customerId: r[0] || "",
      name: r[1] || "",
      email: r[2] || "",
      loyaltyTier: (r[3] as Customer["loyaltyTier"]) || "Bronze",
      registeredDate: r[4] || "",
    }));

    cachedCustomersResult = { customers, cachedAt: Date.now() };
    return customers;
  } catch (err) {
    console.warn("Could not fetch Customers from Google Sheets, using memory fallback:", err);
    return memoryCustomers;
  }
}

export async function searchProducts(query?: string, category?: string): Promise<Product[]> {
  const allProducts = await getProducts();
  return allProducts.filter((p) => {
    const matchQuery =
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase());
    const matchCategory = !category || p.category.toLowerCase() === category.toLowerCase();
    return matchQuery && matchCategory;
  });
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const orders = await getAllOrders();
  const normalized = orderId.trim().toUpperCase();
  return orders.find((o) => o.orderId.toUpperCase() === normalized) || null;
}

export async function getOrdersByCustomer(email: string): Promise<Order[]> {
  const orders = await getAllOrders();
  const normalized = email.trim().toLowerCase();
  return orders.filter((o) => o.customerEmail.toLowerCase() === normalized);
}

export async function findOrdersByCustomerNameOrEmail(searchTerm: string): Promise<Order[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];
  const orders = await getAllOrders();
  return orders.filter(
    (o) =>
      o.customerEmail.toLowerCase().includes(term) ||
      o.customerName.toLowerCase().includes(term)
  );
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const customers = await getAllCustomers();
  const normalized = email.trim().toLowerCase();
  return customers.find((c) => c.email.toLowerCase() === normalized) || null;
}

// Production-grade Customer OTP & Verified Session store
interface CustomerOtpRecord {
  orderId: string;
  email: string;
  otpCode: string;
  expiresAt: number;
  failedAttempts: number;
  lastRequestedAt: number;
}
const customerOtpStore = new Map<string, CustomerOtpRecord>();

// Verified session token store (tokens issued after OTP verification, valid for 15 minutes)
interface CustomerSession {
  orderId: string;
  email: string;
  expiresAt: number;
}
const verifiedCustomerSessions = new Map<string, CustomerSession>();

// Order lockout store: locks order for 5 minutes after 3 consecutive failed verification attempts
const orderLockoutStore = new Map<string, number>();

export function storeCustomerOtp(orderId: string, email: string): {
  success: boolean;
  otpCode?: string;
  message?: string;
  cooldownSeconds?: number;
} {
  const normalizedOrder = orderId.trim().toUpperCase();
  const now = Date.now();

  // Check security lockout
  const lockoutUntil = orderLockoutStore.get(normalizedOrder);
  if (lockoutUntil && now < lockoutUntil) {
    const remainingSecs = Math.ceil((lockoutUntil - now) / 1000);
    return {
      success: false,
      cooldownSeconds: remainingSecs,
      message: `Order #${normalizedOrder} is temporarily locked due to repeated incorrect codes. Please try again in ${remainingSecs} seconds.`,
    };
  }

  const existing = customerOtpStore.get(normalizedOrder);

  // 60-second cooldown per order to prevent OTP spamming
  if (existing && now - existing.lastRequestedAt < 60 * 1000) {
    const cooldownSeconds = Math.ceil((60 * 1000 - (now - existing.lastRequestedAt)) / 1000);
    return {
      success: false,
      cooldownSeconds,
      message: `A verification code was recently generated. Please wait ${cooldownSeconds} seconds before requesting a new code.`,
    };
  }

  // Cryptographically secure 6-digit OTP token
  const otpCode = crypto.randomInt(100000, 1000000).toString();

  customerOtpStore.set(normalizedOrder, {
    orderId: normalizedOrder,
    email: email.trim().toLowerCase(),
    otpCode,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes expiry
    failedAttempts: 0,
    lastRequestedAt: now,
  });

  return { success: true, otpCode };
}

export function verifyCustomerOtp(
  orderId: string,
  code: string
): { verified: boolean; email?: string; sessionToken?: string; message?: string } {
  const normalizedOrder = orderId.trim().toUpperCase();
  const now = Date.now();

  const lockoutUntil = orderLockoutStore.get(normalizedOrder);
  if (lockoutUntil && now < lockoutUntil) {
    const remainingSecs = Math.ceil((lockoutUntil - now) / 1000);
    return {
      verified: false,
      message: `Account verification is locked due to security limits. Please try again in ${remainingSecs} seconds.`,
    };
  }

  const record = customerOtpStore.get(normalizedOrder);

  if (!record) {
    return {
      verified: false,
      message: "No active verification code found for this order. Please request a new verification code.",
    };
  }

  if (now > record.expiresAt) {
    customerOtpStore.delete(normalizedOrder);
    return {
      verified: false,
      message: "Verification code has expired. Please request a new code.",
    };
  }

  if (record.failedAttempts >= 3) {
    customerOtpStore.delete(normalizedOrder);
    orderLockoutStore.set(normalizedOrder, now + 5 * 60 * 1000);
    return {
      verified: false,
      message: "Too many failed attempts. For your security, this order is locked for 5 minutes.",
    };
  }

  if (record.otpCode !== code.trim()) {
    record.failedAttempts += 1;
    const remaining = 3 - record.failedAttempts;
    if (remaining <= 0) {
      customerOtpStore.delete(normalizedOrder);
      orderLockoutStore.set(normalizedOrder, now + 5 * 60 * 1000);
      return {
        verified: false,
        message: "Too many failed attempts. Verification locked for 5 minutes. Please request a new code later.",
      };
    }
    return {
      verified: false,
      message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // One-time consumption: immediately remove the used OTP code
  customerOtpStore.delete(normalizedOrder);

  // Issue short-lived verified session token (valid for 15 minutes)
  const sessionToken = crypto.randomBytes(24).toString("hex");
  verifiedCustomerSessions.set(sessionToken, {
    orderId: normalizedOrder,
    email: record.email,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return { verified: true, email: record.email, sessionToken };
}

export function isCustomerSessionValid(orderId: string, sessionToken?: string): boolean {
  if (!sessionToken) return false;
  const session = verifiedCustomerSessions.get(sessionToken);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    verifiedCustomerSessions.delete(sessionToken);
    return false;
  }
  return session.orderId === orderId.trim().toUpperCase();
}

export async function getRefundRequests(): Promise<RefundRequest[]> {
  const client = getSheetsClient();
  if (!client) return memoryRefunds;

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "RefundRequests!A2:L",
    });

    const rows = res.data.values || [];
    const sheetRefunds: RefundRequest[] = rows.map((r) => ({
      refundId: r[0],
      orderId: r[1],
      customerEmail: r[2],
      productId: r[3],
      refundAmount: parseFloat(r[4]) || 0,
      reason: r[5],
      policyCitation: r[6],
      eligibilityStatus: (r[7] as RefundRequest["eligibilityStatus"]) || "Pending_Admin_Review",
      adminStatus: (r[8] as RefundRequest["adminStatus"]) || "PENDING",
      createdAt: r[9],
      approvedAt: r[10] || "",
      emailStatus: (r[11] as RefundRequest["emailStatus"]) || undefined,
    }));

    // Merge in-memory refunds: if a refund was created in memory but failed to append to Sheets,
    // ensure it is still returned so it is never hidden from administrators
    const sheetIds = new Set(sheetRefunds.map((r) => r.refundId));
    const memoryMap = new Map(memoryRefunds.map((r) => [r.refundId, r]));

    const unpersistedFromMemory = memoryRefunds.filter((r) => !sheetIds.has(r.refundId));

    // Overlay any fresher local memory states (such as emailStatus or recent local status updates)
    const mergedSheetRefunds = sheetRefunds.map((sr) => {
      const mem = memoryMap.get(sr.refundId);
      if (mem) {
        return {
          ...sr,
          emailStatus: mem.emailStatus || sr.emailStatus,
          adminStatus: mem.adminStatus || sr.adminStatus,
        };
      }
      return sr;
    });

    // Background outbox sync: attempt to flush any unpersisted durable refunds to Google Sheets
    if (unpersistedFromMemory.length > 0) {
      (async () => {
        for (const item of unpersistedFromMemory) {
          try {
            await client.sheets.spreadsheets.values.append({
              spreadsheetId: client.sheetId,
              range: "RefundRequests!A:K",
              valueInputOption: "USER_ENTERED",
              requestBody: {
                values: [
                  [
                    item.refundId,
                    item.orderId,
                    item.customerEmail,
                    item.productId,
                    item.refundAmount.toString(),
                    item.reason,
                    item.policyCitation,
                    item.eligibilityStatus,
                    item.adminStatus,
                    item.createdAt,
                    item.approvedAt || "",
                  ],
                ],
              },
            });
            const memItem = memoryRefunds.find((r) => r.refundId === item.refundId);
            if (memItem) {
              (memItem as any).persistedToSheets = true;
              saveDurableRefunds(memoryRefunds);
            }
          } catch (syncErr) {
            // Preserved in durable outbox for next sync attempt
          }
        }
      })().catch(() => {});
    }

    return [...unpersistedFromMemory, ...mergedSheetRefunds];
  } catch (err) {
    return memoryRefunds;
  }
}

export async function updateRefundEmailStatus(
  refundId: string,
  emailStatus: "PENDING" | "SMTP_ACCEPTED" | "TEST_DISPATCHED" | "FAILED"
): Promise<void> {
  const index = memoryRefunds.findIndex((r) => r.refundId === refundId);
  if (index !== -1) {
    memoryRefunds[index].emailStatus = emailStatus;
    saveDurableRefunds(memoryRefunds);
  }

  const client = getSheetsClient();
  if (client) {
    try {
      const res = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.sheetId,
        range: "RefundRequests!A:A",
      });
      const rows = res.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === refundId);
      if (rowIndex !== -1) {
        const rowNumber = rowIndex + 1;
        await client.sheets.spreadsheets.values.update({
          spreadsheetId: client.sheetId,
          range: `RefundRequests!L${rowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[emailStatus]] },
        });
      }
    } catch (err) {
      console.warn("Could not sync email status to Google Sheets column L:", err);
    }
  }
}

export async function createRefundRequest(refund: Omit<RefundRequest, "refundId" | "createdAt" | "approvedAt">): Promise<RefundRequest & { persistedToSheets: boolean }> {
  const refundId = `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const createdAt = new Date().toISOString();
  const approvedAt = refund.adminStatus === "APPROVED" ? createdAt : "";

  let persistedToSheets = false;
  const newRefund: RefundRequest & { persistedToSheets: boolean } = {
    ...refund,
    refundId,
    createdAt,
    approvedAt,
    persistedToSheets: false,
  };

  // 1. Immediately persist to durable on-disk outbox store
  memoryRefunds.unshift(newRefund);
  saveDurableRefunds(memoryRefunds);

  // 2. Attempt Google Sheets append
  const client = getSheetsClient();
  if (client) {
    try {
      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.sheetId,
        range: "RefundRequests!A:K",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              newRefund.refundId,
              newRefund.orderId,
              newRefund.customerEmail,
              newRefund.productId,
              newRefund.refundAmount.toString(),
              newRefund.reason,
              newRefund.policyCitation,
              newRefund.eligibilityStatus,
              newRefund.adminStatus,
              newRefund.createdAt,
              newRefund.approvedAt,
            ],
          ],
        },
      });
      persistedToSheets = true;
      newRefund.persistedToSheets = true;
      saveDurableRefunds(memoryRefunds);
    } catch (err) {
      console.error("Failed to append refund to Google Sheets (preserved in durable outbox):", err);
    }
  }

  return newRefund;
}

export async function updateRefundStatus(
  refundId: string,
  newAdminStatus: "APPROVED" | "REJECTED"
): Promise<{ success: boolean; refund?: RefundRequest; error?: string }> {
  const index = memoryRefunds.findIndex((r) => r.refundId === refundId);
  const now = new Date().toISOString();
  let updatedRefund: RefundRequest | undefined;

  if (index !== -1) {
    memoryRefunds[index].adminStatus = newAdminStatus;
    if (newAdminStatus === "APPROVED") {
      memoryRefunds[index].approvedAt = now;
      memoryRefunds[index].eligibilityStatus = "Approved";
    } else {
      memoryRefunds[index].eligibilityStatus = "Rejected";
    }
    updatedRefund = { ...memoryRefunds[index] };
    saveDurableRefunds(memoryRefunds);
  }

  const client = getSheetsClient();
  if (client) {
    try {
      // Find row in Google Sheets
      const res = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.sheetId,
        range: "RefundRequests!A:K",
      });
      const rows = res.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === refundId);

      if (rowIndex !== -1) {
        const row = rows[rowIndex];
        const rowNumber = rowIndex + 1; // 1-based index
        const eligibility = newAdminStatus === "APPROVED" ? "Approved" : "Rejected";
        const approvedAtVal = newAdminStatus === "APPROVED" ? now : "";

        await client.sheets.spreadsheets.values.update({
          spreadsheetId: client.sheetId,
          range: `RefundRequests!H${rowNumber}:K${rowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[eligibility, newAdminStatus, row[9] || now, approvedAtVal]],
          },
        });

        updatedRefund = {
          refundId: row[0],
          orderId: row[1],
          customerEmail: row[2],
          productId: row[3],
          refundAmount: parseFloat(row[4]) || 0,
          reason: row[5],
          policyCitation: row[6],
          eligibilityStatus: eligibility as RefundRequest["eligibilityStatus"],
          adminStatus: newAdminStatus,
          createdAt: row[9] || now,
          approvedAt: approvedAtVal,
        };

        if (index === -1) {
          memoryRefunds.unshift(updatedRefund);
        }
        saveDurableRefunds(memoryRefunds);
      }
    } catch (err: any) {
      console.error("Failed to update refund in Google Sheets:", err);
    }
  }

  if (!updatedRefund && index !== -1) {
    updatedRefund = memoryRefunds[index];
  }

  return { success: !!updatedRefund, refund: updatedRefund };
}

export async function logCustomerInteraction(log: Omit<InteractionLog, "interactionId" | "timestamp">): Promise<void> {
  const interactionId = `INT-${Date.now()}`;
  const timestamp = new Date().toISOString();

  const newLog: InteractionLog = {
    ...log,
    interactionId,
    timestamp,
  };

  memoryInteractions.unshift(newLog);

  const client = getSheetsClient();
  if (client) {
    try {
      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.sheetId,
        range: "InteractionsLog!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              newLog.interactionId,
              newLog.timestamp,
              newLog.customerEmail,
              newLog.customerQuery,
              newLog.agentResponse,
              newLog.toolCallsUsed,
            ],
          ],
        },
      });
    } catch (err) {
      console.error("Failed to append interaction log to Google Sheets:", err);
    }
  }
}

export async function getInteractionsLog(): Promise<InteractionLog[]> {
  const client = getSheetsClient();
  if (!client) return memoryInteractions;

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "InteractionsLog!A2:F",
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return memoryInteractions;

    return rows.map((r) => ({
      interactionId: r[0],
      timestamp: r[1],
      customerEmail: r[2],
      customerQuery: r[3],
      agentResponse: r[4],
      toolCallsUsed: r[5] || "",
    }));
  } catch (err) {
    return memoryInteractions;
  }
}
