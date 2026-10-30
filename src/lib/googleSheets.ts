import * as fs from "fs";
import * as path from "path";
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

// Local in-memory store for fallback & caching
let memoryProducts: Product[] = [...INITIAL_PRODUCTS];
let memoryOrders: Order[] = [...INITIAL_ORDERS];
let memoryCustomers: Customer[] = [...INITIAL_CUSTOMERS];
let memoryRefunds: RefundRequest[] = [...INITIAL_REFUNDS];
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

let cachedProductsResult: { products: Product[]; cachedAt: number } | null = null;

export async function getProducts(forceRefresh = false): Promise<Product[]> {
  if (!forceRefresh && cachedProductsResult && Date.now() - cachedProductsResult.cachedAt < 60000) {
    return cachedProductsResult.products;
  }

  const client = getSheetsClient();
  if (!client) return memoryProducts;

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "Products!A2:H",
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return memoryProducts;

    const products = rows.map((row) => ({
      id: row[0] || "",
      name: row[1] || "",
      category: row[2] || "",
      price: parseFloat(row[3]) || 0,
      discountPercent: parseFloat(row[4]) || 0,
      stockQuantity: parseInt(row[5], 10) || 0,
      description: row[6] || "",
      eligibleForRefund: row[7]?.toUpperCase() === "TRUE",
    }));

    cachedProductsResult = { products, cachedAt: Date.now() };
    return products;
  } catch (err) {
    console.warn("Could not fetch Products from Google Sheets, using memory fallback:", err);
    return memoryProducts;
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
  const client = getSheetsClient();
  if (!client) {
    return memoryOrders.find((o) => o.orderId.toUpperCase() === orderId.trim().toUpperCase()) || null;
  }

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "Orders!A2:K",
    });

    const rows = res.data.values || [];
    const matched = rows.find((r) => r[0]?.toUpperCase() === orderId.trim().toUpperCase());
    if (!matched) return null;

    return {
      orderId: matched[0],
      customerEmail: matched[1],
      customerName: matched[2],
      orderDate: matched[3],
      deliveryDate: matched[4],
      productId: matched[5],
      productName: matched[6],
      quantity: parseInt(matched[7], 10) || 1,
      totalAmount: parseFloat(matched[8]) || 0,
      paymentMethod: matched[9],
      orderStatus: (matched[10] as Order["orderStatus"]) || "Delivered",
    };
  } catch (err) {
    console.warn("Could not fetch Order from Google Sheets, falling back to memory:", err);
    return memoryOrders.find((o) => o.orderId.toUpperCase() === orderId.trim().toUpperCase()) || null;
  }
}

export async function getOrdersByCustomer(email: string): Promise<Order[]> {
  const client = getSheetsClient();
  if (!client) {
    return memoryOrders.filter((o) => o.customerEmail.toLowerCase() === email.trim().toLowerCase());
  }

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "Orders!A2:K",
    });

    const rows = res.data.values || [];
    return rows
      .filter((r) => r[1]?.toLowerCase() === email.trim().toLowerCase())
      .map((r) => ({
        orderId: r[0],
        customerEmail: r[1],
        customerName: r[2],
        orderDate: r[3],
        deliveryDate: r[4],
        productId: r[5],
        productName: r[6],
        quantity: parseInt(r[7], 10) || 1,
        totalAmount: parseFloat(r[8]) || 0,
        paymentMethod: r[9],
        orderStatus: (r[10] as Order["orderStatus"]) || "Delivered",
      }));
  } catch (err) {
    return memoryOrders.filter((o) => o.customerEmail.toLowerCase() === email.trim().toLowerCase());
  }
}

export async function findOrdersByCustomerNameOrEmail(searchTerm: string): Promise<Order[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  const client = getSheetsClient();
  if (!client) {
    return memoryOrders.filter(
      (o) =>
        o.customerEmail.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term)
    );
  }

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "Orders!A2:K",
    });

    const rows = res.data.values || [];
    return rows
      .filter((r) => {
        const email = (r[1] || "").toLowerCase();
        const name = (r[2] || "").toLowerCase();
        return email.includes(term) || name.includes(term);
      })
      .map((r) => ({
        orderId: r[0],
        customerEmail: r[1],
        customerName: r[2],
        orderDate: r[3],
        deliveryDate: r[4],
        productId: r[5],
        productName: r[6],
        quantity: parseInt(r[7], 10) || 1,
        totalAmount: parseFloat(r[8]) || 0,
        paymentMethod: r[9],
        orderStatus: (r[10] as Order["orderStatus"]) || "Delivered",
      }));
  } catch (err) {
    return memoryOrders.filter(
      (o) =>
        o.customerEmail.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term)
    );
  }
}


export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const client = getSheetsClient();
  if (!client) {
    return memoryCustomers.find((c) => c.email.toLowerCase() === email.trim().toLowerCase()) || null;
  }

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "Customers!A2:E",
    });

    const rows = res.data.values || [];
    const matched = rows.find((r) => r[2]?.toLowerCase() === email.trim().toLowerCase());
    if (!matched) return null;

    return {
      customerId: matched[0],
      name: matched[1],
      email: matched[2],
      loyaltyTier: (matched[3] as Customer["loyaltyTier"]) || "Bronze",
      registeredDate: matched[4],
    };
  } catch (err) {
    return memoryCustomers.find((c) => c.email.toLowerCase() === email.trim().toLowerCase()) || null;
  }
}

export async function getRefundRequests(): Promise<RefundRequest[]> {
  const client = getSheetsClient();
  if (!client) return memoryRefunds;

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: "RefundRequests!A2:K",
    });

    const rows = res.data.values || [];
    return rows.map((r) => ({
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
    }));
  } catch (err) {
    return memoryRefunds;
  }
}

export async function createRefundRequest(refund: Omit<RefundRequest, "refundId" | "createdAt" | "approvedAt">): Promise<RefundRequest> {
  const refundId = `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const createdAt = new Date().toISOString();
  const approvedAt = refund.adminStatus === "APPROVED" ? createdAt : "";

  const newRefund: RefundRequest = {
    ...refund,
    refundId,
    createdAt,
    approvedAt,
  };

  memoryRefunds.unshift(newRefund);

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
    } catch (err) {
      console.error("Failed to append refund to Google Sheets:", err);
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

  if (index !== -1) {
    memoryRefunds[index].adminStatus = newAdminStatus;
    if (newAdminStatus === "APPROVED") {
      memoryRefunds[index].approvedAt = now;
      memoryRefunds[index].eligibilityStatus = "Approved";
    } else {
      memoryRefunds[index].eligibilityStatus = "Rejected";
    }
  }

  const client = getSheetsClient();
  if (client) {
    try {
      // Find row number in Google Sheets
      const res = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.sheetId,
        range: "RefundRequests!A:A",
      });
      const rows = res.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === refundId);

      if (rowIndex !== -1) {
        const rowNumber = rowIndex + 1; // 1-based index
        const eligibility = newAdminStatus === "APPROVED" ? "Approved" : "Rejected";
        const approvedAtVal = newAdminStatus === "APPROVED" ? now : "";

        await client.sheets.spreadsheets.values.update({
          spreadsheetId: client.sheetId,
          range: `RefundRequests!H${rowNumber}:K${rowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[eligibility, newAdminStatus, memoryRefunds[index]?.createdAt || now, approvedAtVal]],
          },
        });
      }
    } catch (err: any) {
      console.error("Failed to update refund in Google Sheets:", err);
    }
  }

  const updated = memoryRefunds.find((r) => r.refundId === refundId);
  return { success: true, refund: updated };
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
