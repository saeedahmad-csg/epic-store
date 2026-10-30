import { GoogleGenAI, Type } from "@google/genai";
import {
  searchProducts,
  getOrderById,
  getCustomerByEmail,
  findOrdersByCustomerNameOrEmail,
  createRefundRequest,
  logCustomerInteraction,
  updateRefundStatus,
} from "./googleSheets";
import { getCompanyPolicies, searchPolicyRAG } from "./policies";
import { sendRefundConfirmationEmail } from "./email";

/**
 * Sanitizes payment method by stripping card digits so they are never exposed to users
 * e.g., "Credit Card (Mastercard ending 8819)" -> "Credit Card (Mastercard)"
 */
export function sanitizePaymentMethod(method?: string): string {
  if (!method) return "Credit Card";
  let cleaned = method.replace(/\s*ending\s+\d{4}/i, "");
  cleaned = cleaned.replace(/\b\d{4}\b/g, ""); // strip any lingering 4-digit card numbers
  cleaned = cleaned.replace(/\(\s*\)/, "");
  return cleaned.trim();
}

/**
 * Extracts last 4 digits of card if present for verification checks only
 */
export function extractCardLast4(method?: string): string | null {
  if (!method) return null;
  const match = method.match(/\b(\d{4})\b/);
  return match ? match[1] : null;
}

// In-memory runtime settings (can be toggled by Admin)
export const runtimeSettings = {
  autoApproveRefunds: false, // Default is Human-in-the-Loop review
};

// Tool Declarations for Gemini
const toolsDeclarations: any[] = [
  {
    name: "search_products",
    description: "Search product catalog, pricing, discounts, promotions, and stock levels from Google Sheets.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Search keyword for product name, category, or description (e.g., 'headphones', 'smartwatch', 'keyboard').",
        },
        category: {
          type: Type.STRING,
          description: "Optional product category filter (e.g., 'Electronics', 'Audio', 'Computing', 'Accessories').",
        },
      },
    },
  },
  {
    name: "lookup_order",
    description: "Retrieve order details, delivery dates, items purchased, and status from Google Sheets. Can look up by unique Order ID, or search by customer name or email.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: {
          type: Type.STRING,
          description: "Optional: The unique order reference ID (e.g. 'ORD-1001', 'ORD-1008').",
        },
        customerQuery: {
          type: Type.STRING,
          description: "Optional: Customer name or email to search orders belonging to that person (e.g. 'Peter Parker', 'peter.parker@example.com').",
        },
      },
    },
  },
  {
    name: "check_refund_policy",
    description: "Reads the official company return and refund policy extracted from the company Word (.docx) document.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description: "Specific policy query or topic (e.g., 'return window', 'defective items', 'earbuds hygiene', 'restocking fee', 'gold tier').",
        },
      },
    },
  },
  {
    name: "evaluate_and_submit_refund",
    description: "Evaluates refund eligibility using the policy document and Google Sheets order data, and records the refund request.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: {
          type: Type.STRING,
          description: "The Order ID to refund (e.g. 'ORD-1001').",
        },
        customerEmail: {
          type: Type.STRING,
          description: "Customer's email address associated with the order.",
        },
        reason: {
          type: Type.STRING,
          description: "Detailed reason given by customer for requesting refund.",
        },
        condition: {
          type: Type.STRING,
          description: "Condition of the item: 'defective_on_arrival', 'unopened_change_of_mind', 'opened_working', or 'accidental_damage'.",
        },
      },
      required: ["orderId", "customerEmail", "reason", "condition"],
    },
  },
];

/**
 * Execute tool calls locally against Google Sheets, Policy engine, and Email service
 */
async function executeTool(name: string, args: any): Promise<any> {
  console.log(`🛠️ Executing Agent Tool: ${name}`, args);

  if (name === "search_products") {
    const products = await searchProducts(args.query, args.category);
    return {
      count: products.length,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        originalPrice: `$${p.price.toFixed(2)}`,
        discount: `${p.discountPercent}% OFF`,
        currentPrice: `$${(p.price * (1 - p.discountPercent / 100)).toFixed(2)}`,
        inStock: p.stockQuantity > 0,
        stockAvailable: p.stockQuantity,
        refundable: p.eligibleForRefund,
        description: p.description,
      })),
    };
  }

  if (name === "lookup_order") {
    if (args.orderId) {
      const order = await getOrderById(args.orderId);
      if (!order) {
        return { found: false, message: `Order #${args.orderId} not found in our store records.` };
      }
      const customer = await getCustomerByEmail(order.customerEmail);
      const cardLast4 = extractCardLast4(order.paymentMethod);
      const sanitizedPayment = sanitizePaymentMethod(order.paymentMethod);
      return {
        found: true,
        order: {
          ...order,
          paymentMethod: sanitizedPayment,
          cardLast4ForVerificationOnly: cardLast4, // DO NOT EXPOSE TO CUSTOMER; only for verifying if customer provides card digits
          customerTier: customer?.loyaltyTier || "Bronze",
        },
      };
    } else if (args.customerQuery) {
      const orders = await findOrdersByCustomerNameOrEmail(args.customerQuery);
      if (orders.length === 0) {
        return { found: false, message: `No orders found in our store records for customer "${args.customerQuery}".` };
      }
      return {
        found: true,
        count: orders.length,
        orders: orders.map((o) => ({
          orderId: o.orderId,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          productName: o.productName,
          quantity: o.quantity,
          totalAmount: `$${o.totalAmount.toFixed(2)}`,
          paymentMethod: sanitizePaymentMethod(o.paymentMethod),
          cardLast4ForVerificationOnly: extractCardLast4(o.paymentMethod),
          orderStatus: o.orderStatus,
          deliveryDate: o.deliveryDate,
        })),
      };
    } else {
      return { found: false, message: "Please provide either an orderId (e.g. ORD-1001) or a customer name/email." };
    }
  }

  if (name === "check_refund_policy") {
    const queryTopic = args.topic || "";
    const matchedClauses = await searchPolicyRAG(queryTopic, 3);
    const policies = await getCompanyPolicies();
    return {
      documentSource: "company_policies.docx",
      queryTopic,
      lastUpdated: policies.lastUpdated,
      retrievedClauses: matchedClauses.map((c) => ({
        sectionId: c.sectionId,
        title: c.title,
        content: c.content,
        relevanceScore: `${c.relevanceScore}%`,
        confidence: c.matchConfidence,
        matchedTokens: c.matchedTokens,
      })),
      policySummary: "All refund decisions and answers must cite these retrieved clauses verbatim by Section ID.",
    };
  }

  if (name === "evaluate_and_submit_refund") {
    const order = await getOrderById(args.orderId);
    if (!order) {
      return { success: false, message: `Cannot process refund: Order #${args.orderId} does not exist.` };
    }

    const customer = await getCustomerByEmail(args.customerEmail || order.customerEmail);
    const policies = await getCompanyPolicies();

    // Calculate days since delivery
    let daysSinceDelivery = 999;
    if (order.deliveryDate && order.deliveryDate !== "Pending Delivery") {
      const delivery = new Date(order.deliveryDate);
      const diffMs = Date.now() - delivery.getTime();
      daysSinceDelivery = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const isGold = customer?.loyaltyTier === "Gold";
    const allowedDays = isGold ? 45 : 30;

    let eligible = true;
    let refundAmount = order.totalAmount;
    let citation = "";
    let reasonDetail = args.reason;

    // Check delivery status
    if (order.orderStatus !== "Delivered") {
      eligible = false;
      citation = "[SEC-1: Overview & General Policy] Item has not been delivered yet. Active order cancellation is required instead.";
    }
    // Check digital items (Strictly non-refundable, no exceptions)
    else if (order.productId === "PROD-107") {
      eligible = false;
      citation = "[SEC-4.1: Digital Items & Gift Cards] Digital products, electronic gift cards, and software licenses are strictly non-refundable once delivered.";
    }
    // Check clearance / final sale (DOA exception applies under Sec 2.3 & 3.1)
    else if (order.productId === "PROD-108") {
      if (args.condition !== "defective_on_arrival") {
        eligible = false;
        citation = "[SEC-2.3: Final Sale & Clearance] Clearance and final sale items are non-refundable unless verified defective on arrival.";
      } else {
        citation = "[SEC-2.3 Exception & SEC-3.1] Final Sale item accepted due to verified Defective on Arrival (DOA).";
      }
    }
    // Check accidental damage
    else if (args.condition === "accidental_damage") {
      eligible = false;
      citation = "[SEC-3.4: Accidental Damage] Accidental damage, liquid spills, and customer misuse are strictly ineligible for return refunds.";
    }
    // Check return window
    else if (daysSinceDelivery > allowedDays) {
      eligible = false;
      citation = `[SEC-2.1 & SEC-2.4: Return Windows] Exceeded return window (${daysSinceDelivery} days since delivery; maximum allowed is ${allowedDays} days for ${customer?.loyaltyTier || "standard"} tier).`;
    }
    // Opened goods fee
    else if (args.condition === "opened_working") {
      const restockingFee = isGold ? 0 : 5.0;
      refundAmount = Math.max(0, order.totalAmount - restockingFee);
      citation = isGold
        ? "[SEC-2.4: Loyalty Tier Extension] Gold Tier perk applied: $5 restocking fee waived under Section 2.4. 100% full refund granted."
        : "[SEC-3.3: Opened Goods] Opened goods in working condition eligible minus standard $5.00 restocking fee.";
    }
    // DOA
    else if (args.condition === "defective_on_arrival") {
      refundAmount = order.totalAmount;
      citation = "[SEC-3.1: Defective on Arrival] 100% full refund + complimentary return shipping label.";
    } else {
      citation = "[SEC-3.2: Unopened Items] Unopened item within return window - 100% full product refund.";
    }

    const adminStatus = runtimeSettings.autoApproveRefunds && eligible ? "APPROVED" : "PENDING";
    const eligibilityStatus = eligible ? (adminStatus === "APPROVED" ? "Approved" : "Pending_Admin_Review") : "Rejected";

    const savedRefund = await createRefundRequest({
      orderId: order.orderId,
      customerEmail: order.customerEmail,
      productId: order.productId,
      refundAmount: eligible ? refundAmount : 0,
      reason: reasonDetail,
      policyCitation: citation,
      eligibilityStatus,
      adminStatus,
    });

    // If auto-approved, trigger confirmation email immediately
    if (adminStatus === "APPROVED") {
      await sendRefundConfirmationEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        refundId: savedRefund.refundId,
        orderId: order.orderId,
        productName: order.productName,
        amount: savedRefund.refundAmount,
        reason: savedRefund.reason,
      });
    }

    return {
      success: true,
      refundId: savedRefund.refundId,
      isEligible: eligible,
      refundAmount: savedRefund.refundAmount,
      policyCitation: citation,
      adminStatus,
      eligibilityStatus,
      requiresAdminApproval: adminStatus === "PENDING",
      daysSinceDelivery,
      allowedReturnWindow: allowedDays,
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

/**
 * Handle incoming chat interaction with Gemini API
 */
export async function processChatWithAgent(params: {
  messages: Array<{ role: "user" | "assistant" | "model"; content: string }>;
  customerEmail?: string;
}): Promise<{
  reply: string;
  toolCalls: string[];
  refundData?: any;
}> {
  const { messages, customerEmail = "guest@example.com" } = params;
  const toolCallsLog: string[] = [];
  let detectedRefundData: any = null;

  const apiKey = process.env.GEMINI_API_KEY;

  const policies = await getCompanyPolicies();

  const systemInstruction = `You are "Eren", the strictly-grounded AI Customer Support & Concierge Agent for ApexStore Global Retail.
You have real-time access to our live database (Products, Orders, Customers, Refunds, Interaction Logs) and company policies parsed from company_policies.docx.

STRICT GROUNDING, SECURITY & PRIVACY DIRECTIVES:
1. CUSTOMER AUTHENTICATION & DATA PROTECTION (CRITICAL):
   - A customer's name alone is public knowledge and is NOT sufficient verification to disclose order contents, pricing, or purchase history.
   - If a customer introduces themselves by name only (e.g. "My name is Peter Parker, please track my order"):
     a. Use 'lookup_order' with customerQuery to check if an account exists.
     b. If an account is found, state that orders were found under that name, but DO NOT list the order details or item contents yet. Politely require verification: "Hello [Name]! To protect your privacy and account security, please confirm the email address or the last 4 digits of the card you used during checkout to view your order details."
     c. Once the customer confirms their matching email address or last 4 digits of their card, you may disclose the order details.
   - If an Order ID provided belongs to a DIFFERENT person than the user claiming it, do not disclose personal details (email, full payment details).
   - PAYMENT CARD PRIVACY: NEVER expose or display the last 4 digits of a card (e.g. NEVER print "ending 8819" or any card numbers). Always format the payment method as "Credit Card (Mastercard)", "Credit Card (Visa)", "PayPal", etc. You CAN ask the customer for the last 4 digits to verify their identity, but you must NEVER display or echo them back in your responses.
   - NEVER expose internal infrastructure details: never say "Google Sheets database" to customers; always refer to "our store records" or "our system".
2. STRICT TRUTH ONLY: Never invent, guess, or extrapolate products, prices, discounts, stock levels, order delivery dates, or return policies. All facts MUST be retrieved via tool calls.
3. NOT FOUND: If a requested product or order ID is not found, state clearly: "I could not find that item/order in our store records. Please verify the ID or search term." Do NOT make up mock data.
4. POLICY VERIFICATION: When evaluating return or refund eligibility, check the order delivery date and item condition against the retrieved clauses from company_policies.docx. Cite the exact Section Number and verbatim rule (e.g. "Under Section 3: Defective on Arrival (DOA)...").
5. ACCURATE NUMBERS: Never round or estimate prices. State the exact original and discounted prices as returned from the system.
6. REFUND EXECUTION: When a customer requests a refund or return:
   - If no Order ID is given, ask the customer for their Order ID first.
   - Step 1: Call 'lookup_order' with the Order ID.
   - Step 2: Call 'evaluate_and_submit_refund' with order details, reason, and condition ('defective_on_arrival', 'opened_working', 'unopened_change_of_mind', or 'accidental_damage').
   - Step 3: Present the customer with their Refund ID, policy section cited, approved refund amount, and next steps (admin approval or email confirmation).
7. CONCISE & FAST: Deliver fast, crisp, helpful answers formatted cleanly in Markdown.`;

  // Fallback mode if GEMINI_API_KEY is not set yet
  if (!apiKey || apiKey === "your-gemini-api-key") {
    const lastUserMsg = messages[messages.length - 1]?.content || "";
    return await simulateAgentResponse(messages, customerEmail);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Format full multi-turn history for Gemini contents
    const contents: any[] = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const thinkingBudget = parseInt(process.env.GEMINI_THINKING_BUDGET || "0", 10);

    const baseConfig: any = {
      systemInstruction,
      tools: [{ functionDeclarations: toolsDeclarations }],
      temperature: 0.1, // Low temperature for maximum grounding
      thinkingConfig: {
        thinkingBudget, // Minimum thinking budget (0) for fastest latency
      },
    };

    // Multi-turn tool execution loop
    let currentResponse = await ai.models.generateContent({
      model: modelName,
      contents,
      config: baseConfig,
    });

    let maxLoops = 5;
    while (maxLoops > 0 && currentResponse.functionCalls && currentResponse.functionCalls.length > 0) {
      maxLoops--;
      const call = currentResponse.functionCalls[0];
      const toolName = call.name || "unknown_tool";
      toolCallsLog.push(toolName);

      const toolResult = await executeTool(toolName, call.args);
      if (toolName === "evaluate_and_submit_refund") {
        detectedRefundData = toolResult;
      }

      // Append exact model parts from Gemini including thought signature
      const modelParts = currentResponse.candidates?.[0]?.content?.parts || [{ functionCall: call }];
      contents.push({
        role: "model",
        parts: modelParts,
      });

      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          },
        ],
      });

      currentResponse = await ai.models.generateContent({
        model: modelName,
        contents,
        config: baseConfig,
      });
    }

    const reply =
      currentResponse.text ||
      currentResponse.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("\n") ||
      "I have processed your request.";

    // Log interaction to Google Sheets
    await logCustomerInteraction({
      customerEmail,
      customerQuery: messages[messages.length - 1]?.content || "",
      agentResponse: reply.slice(0, 500),
      toolCallsUsed: toolCallsLog.join(", ") || "none",
    });

    return {
      reply,
      toolCalls: toolCallsLog,
      refundData: detectedRefundData,
    };
  } catch (err: any) {
    console.error("Gemini API error, falling back to contextual simulator:", err);
    return await simulateAgentResponse(messages, customerEmail);
  }
}

/**
 * Intelligent local simulation engine with full multi-turn conversation memory and strict customer privacy
 */
async function simulateAgentResponse(
  messages: Array<{ role: "user" | "assistant" | "model"; content: string }>,
  customerEmail: string
) {
  const query = messages[messages.length - 1]?.content || "";
  const lower = query.toLowerCase();
  const userMessages = messages.filter((m) => m.role === "user");
  const allUserText = userMessages.map((m) => m.content).join(" ");
  const toolCalls: string[] = [];
  let refundData: any = null;
  let reply = "";
  const stopWords = new Set(["our", "the", "my", "this", "that", "company", "policy", "store", "order", "records", "assistant", "system", "customer", "account", "here", "there", "please", "help"]);

  // Extract customer name ONLY from user messages (never from assistant text like 'under our company policy')
  const nameRegex = /(?:my name is|i am|i'm|name\s*is|name:|account under|order(?:s)? under|placed by)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i;
  const queryNameMatch = query.match(nameRegex);
  const convNameMatch = allUserText.match(nameRegex);
  let detectedName: string | null = queryNameMatch ? queryNameMatch[1].trim() : (convNameMatch ? convNameMatch[1].trim() : null);
  if (detectedName) {
    const words = detectedName.toLowerCase().split(/\s+/);
    if (words.some((w) => stopWords.has(w))) {
      detectedName = null;
    }
  }

  // Extract explicit email if given in query or conversation history
  const queryEmailMatch = query.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const convEmailMatch = allUserText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const detectedEmail = queryEmailMatch ? queryEmailMatch[0].trim() : (convEmailMatch ? convEmailMatch[0].trim() : null);

  // Extract 4-digit card ending if customer provides it for verification (must not match ORD-xxxx)
  const cardRegex = /(?:(?:card|ending|ends?|digits?|#|last\s*4|last\s*four)\s*(?:is|are|in|with|:)?\s*(\d{4})\b|^\s*(\d{4})\s*$)/i;
  const queryCardMatch = query.match(cardRegex);
  const convCardMatch = allUserText.match(cardRegex);
  const detectedCardDigits = queryCardMatch
    ? (queryCardMatch[1] || queryCardMatch[2])
    : (convCardMatch ? (convCardMatch[1] || convCardMatch[2]) : null);

  // Helper to extract Order ID from varied user formats: 'order 1049', 'ORD-1049', '#1049', '1049'
  const extractOrder = (text: string): string | null => {
    if (!text) return null;
    const ordMatch = text.match(/\bORD[-\s#:]*(\d{4})\b/i);
    if (ordMatch) return `ORD-${ordMatch[1]}`;
    const orderNumMatch = text.match(/(?:order|order\s*#|refund\s*(?:for|order)?|return\s*(?:for|order)?|track\s*(?:order)?|#)\s*[:#-]?\s*(\d{4})\b/i);
    if (orderNumMatch) return `ORD-${orderNumMatch[1]}`;
    const plainMatch = text.trim().match(/^#?(\d{4})$/);
    if (plainMatch) return `ORD-${plainMatch[1]}`;
    return null;
  };

  const queryOrderId = extractOrder(query);
  const convOrderId = extractOrder(allUserText);
  const specificOrderId = queryOrderId || convOrderId;

  const isGeneralPolicyQuery =
    (lower.includes("policy") ||
      lower.includes("hygiene") ||
      lower.includes("earbud") ||
      lower.includes("window") ||
      lower.includes("gold tier") ||
      lower.includes("silver tier") ||
      lower.includes("restocking") ||
      lower.includes("fee") ||
      lower.includes("how long") ||
      lower.includes("can i return") ||
      lower.includes("allowed to return")) &&
    !specificOrderId;

  if (isGeneralPolicyQuery) {
    toolCalls.push("check_refund_policy");
    const matched = await searchPolicyRAG(query, 2);
    if (matched.length > 0) {
      const top = matched[0];
      reply = `### 📋 Company Policy: ${top.title}\n\n` +
        `According to **${top.sectionId}** of our official store policy:\n\n` +
        `• ${top.summary}\n\n` +
        (matched.length > 1 && (matched[1].relevanceScore || 0) > 40
          ? `**Related Clause (${matched[1].sectionId})**:\n• ${matched[1].summary}\n\n`
          : "") +
        `Would you like assistance checking a specific order ID under this policy?`;
    } else {
      reply = `Our standard return window is **30 days** for electronics and **14 days** for opened accessories. Apex Gold Tier members enjoy an extended **45-day window**.\n\nCould you please provide your **Order ID** if you would like me to check return eligibility?`;
    }
  } else if (lower.includes("refund") || lower.includes("return")) {
    if (!specificOrderId) {
      reply = `I would be happy to assist you with a return or refund under our company policy!\n\nCould you please provide your **Order ID** (e.g., \`ORD-1001\` or \`ORD-1008\`) so I can pull up your purchase date and verify return eligibility?`;
    } else {
      toolCalls.push("lookup_order", "check_refund_policy", "evaluate_and_submit_refund");

      const condition = lower.includes("defect") || lower.includes("broken") || lower.includes("crack")
        ? "defective_on_arrival"
        : lower.includes("damage") || lower.includes("water") || lower.includes("dropped")
        ? "accidental_damage"
        : "opened_working";

      const evalResult = await executeTool("evaluate_and_submit_refund", {
        orderId: specificOrderId,
        customerEmail: detectedEmail || customerEmail || "customer@example.com",
        reason: query,
        condition,
      });
      refundData = evalResult;

      if (evalResult.isEligible) {
        reply = `### 📄 Policy Evaluation & Refund Submitted\n\n` +
          `I reviewed your request for **Order #${specificOrderId}** against our official **company_policies.docx**.\n\n` +
          `• **Eligibility**: **${evalResult.eligibilityStatus}**\n` +
          `• **Approved Amount**: **$${evalResult.refundAmount.toFixed(2)}**\n` +
          `• **Policy Citation**: *${evalResult.policyCitation}*\n` +
          `• **Days Since Delivery**: ${evalResult.daysSinceDelivery} days (Within ${evalResult.allowedReturnWindow}-day policy window)\n` +
          `• **Refund Reference ID**: \`${evalResult.refundId}\`\n\n` +
          (evalResult.requiresAdminApproval
            ? `🛡️ **Human-in-the-Loop Review**: Your refund has been recorded with status **Pending Admin Review**. Our store admin will verify the request in the Admin Portal. Once approved, an automated confirmation email will be dispatched to your inbox.`
            : `✅ **Automated Instant Approval**: Your refund has been approved! An automated confirmation email has been dispatched with payment credit timeline (3-5 business days).`);
      } else {
        reply = `### ⚠️ Refund Ineligible under Company Policy\n\n` +
          `I reviewed your request for **Order #${specificOrderId}** against our **company_policies.docx**:\n\n` +
          `• **Status**: Ineligible for Return Refund\n` +
          `• **Policy Clause**: *${evalResult.policyCitation}*\n\n` +
          `If you believe this is in error, our store admin can review your request in the Admin Portal.`;
      }
    }
  } else if (
    lower.includes("ord-") ||
    lower.includes("order") ||
    lower.includes("status") ||
    lower.includes("track") ||
    lower.includes("where is") ||
    detectedEmail ||
    detectedCardDigits
  ) {
    toolCalls.push("lookup_order");

    if (specificOrderId) {
      const order = await getOrderById(specificOrderId);
      if (order) {
        const orderCardLast4 = extractCardLast4(order.paymentMethod);
        const sanitizedPayment = sanitizePaymentMethod(order.paymentMethod);

        // Privacy check: If user identified with a different name
        const hasMismatch =
          detectedName &&
          !order.customerName.toLowerCase().includes(detectedName.toLowerCase()) &&
          !detectedName.toLowerCase().includes(order.customerName.toLowerCase());

        const emailVerified =
          detectedEmail && detectedEmail.toLowerCase() === order.customerEmail.toLowerCase();
        const cardVerified =
          detectedCardDigits && orderCardLast4 && detectedCardDigits === orderCardLast4;

        if (hasMismatch && !emailVerified && !cardVerified) {
          if (detectedCardDigits && orderCardLast4 && detectedCardDigits !== orderCardLast4) {
            reply = `### 🔒 Verification Mismatch\n\nThe card digits provided do not match the payment details on file for Order **#${order.orderId}**. Please verify your checkout email or the correct card digits.`;
          } else {
            reply = `### 🔒 Customer Verification Required\n\nOrder **#${order.orderId}** is registered under **${order.customerName.split(" ")[0]}***.\n\nBecause you introduced yourself as **${detectedName}**, for your privacy and account security, please confirm either the **email address** or the **last 4 digits of the card** used when placing this order before full details can be displayed.`;
          }
        } else {
          reply = `### 📦 Order Details for #${order.orderId}\n\n` +
            `• **Item**: ${order.productName} (Qty: ${order.quantity})\n` +
            `• **Customer**: ${order.customerName} (${order.customerEmail})\n` +
            `• **Order Date**: ${order.orderDate}\n` +
            `• **Delivery Status**: **${order.orderStatus}** (Delivered on ${order.deliveryDate})\n` +
            `• **Total Paid**: $${order.totalAmount.toFixed(2)} via ${sanitizedPayment}\n\n` +
            `How can I assist you further with this order?`;
        }
      } else {
        reply = `I could not locate Order **#${specificOrderId}** in our store records. Please verify the order number (e.g., ORD-1001 or ORD-1008).`;
      }
    } else if (detectedName && !detectedEmail && !detectedCardDigits) {
      // 🔒 SECURITY CHECK: Name alone is NOT sufficient credentials to view order history.
      const customerOrders = await findOrdersByCustomerNameOrEmail(detectedName);
      if (customerOrders.length > 0) {
        reply = `### 📦 Account Found for ${detectedName}\n\n` +
          `Hello **${detectedName}**! We found orders associated with your name in our store records.\n\n` +
          `To protect your privacy and account security, **please confirm either the email address or the last 4 digits of the card** you used during checkout to view your order details.`;
      } else {
        reply = `Hello **${detectedName}**! I searched our store records but could not find any orders placed under that name.\n\n` +
          `Could you please provide your **Order ID** (e.g., \`ORD-1001\`) or the **email address** used during checkout?`;
      }
    } else if (detectedEmail || detectedCardDigits) {
      // 🔐 User provided an email or card digits for verification
      const customerOrders = detectedEmail
        ? await findOrdersByCustomerNameOrEmail(detectedEmail)
        : await findOrdersByCustomerNameOrEmail(detectedName || "");

      if (customerOrders.length > 0) {
        const cardMatches =
          !detectedCardDigits ||
          customerOrders.some((o) => extractCardLast4(o.paymentMethod) === detectedCardDigits);
        const emailMatches =
          !detectedEmail ||
          customerOrders.some((o) => o.customerEmail.toLowerCase() === detectedEmail.toLowerCase());

        if (detectedCardDigits && !cardMatches) {
          reply = `### 🔒 Verification Mismatch\n\nThe card digits provided do not match the payment details on file for ${
            detectedName ? `**${detectedName}**` : "your account"
          }. For your security, please verify your details or provide your Order ID.`;
        } else if (detectedEmail && !emailMatches) {
          reply = `### 🔒 Verification Mismatch\n\nThe email **${detectedEmail}** does not match our records for ${
            detectedName ? `**${detectedName}**` : "your account"
          }. For your security, please verify your details or provide your Order ID.`;
        } else if (customerOrders.length === 1) {
          const ord = customerOrders[0];
          reply = `### 📦 Order Details for #${ord.orderId}\n\n` +
            `Hello **${ord.customerName}**! Here is your verified order information:\n\n` +
            `• **Item**: ${ord.productName} (Qty: ${ord.quantity})\n` +
            `• **Customer**: ${ord.customerName} (${ord.customerEmail})\n` +
            `• **Order Date**: ${ord.orderDate}\n` +
            `• **Delivery Status**: **${ord.orderStatus}** (Delivered on ${ord.deliveryDate})\n` +
            `• **Total Paid**: $${ord.totalAmount.toFixed(2)} via ${sanitizePaymentMethod(ord.paymentMethod)}\n\n` +
            `How can I assist you further with this order?`;
        } else {
          reply = `### 📦 Verified Orders for ${customerOrders[0].customerName}\n\n` +
            `Hello **${customerOrders[0].customerName}**! I found **${customerOrders.length} orders** associated with your verified account in our store records:\n\n` +
            customerOrders
              .map(
                (o) =>
                  `• **#${o.orderId}**: ${o.productName} (Qty: ${o.quantity}) — Status: **${o.orderStatus}** (Delivered: ${o.deliveryDate}) — Total: $${o.totalAmount.toFixed(2)}`
              )
              .join("\n") +
            `\n\nWhich order would you like more details on or assistance with?`;
        }
      } else {
        reply = `Hello! I searched our store records but could not find any active orders matching your verification details.\n\nCould you please verify your information or provide your **Order ID** (e.g., \`ORD-1001\`)?`;
      }
    } else {
      reply = `I would be happy to help track your order! To pull up your details, could you please provide your **Order ID** (e.g., \`ORD-1001\` or \`ORD-1008\`) or the **email address** associated with your purchase?`;
    }
  } else if (
    lower.includes("discount") ||
    lower.includes("deal") ||
    lower.includes("price") ||
    lower.includes("product") ||
    lower.includes("headphone") ||
    lower.includes("keyboard") ||
    lower.includes("smartwatch") ||
    lower.includes("earbuds") ||
    lower.includes("monitor")
  ) {
    toolCalls.push("search_products");
    const products = await searchProducts();
    const deals = products.filter((p) => p.discountPercent > 0);
    reply = `### 🏷️ Top Deals & Current Promotions\n\nHere are our best promotions right now from our store catalog:\n\n` +
      deals.map((p) => `• **${p.name}**: **$${(p.price * (1 - p.discountPercent / 100)).toFixed(2)}** (${p.discountPercent}% OFF, regular $${p.price.toFixed(2)}) — *${p.description}* (${p.stockQuantity} in stock)`).join("\n") +
      `\n\nWould you like more details or assistance with placing an order?`;
  } else {
    reply = `👋 Hi! I'm **Eren**, your ApexStore Concierge.\n\nHow can I help you today? You can ask me to **track an order**, check **current deals**, or verify **refund eligibility**.`;
  }

  await logCustomerInteraction({
    customerEmail,
    customerQuery: query,
    agentResponse: reply.slice(0, 500),
    toolCallsUsed: toolCalls.join(", ") || "none",
  });

  return { reply, toolCalls, refundData };
}
