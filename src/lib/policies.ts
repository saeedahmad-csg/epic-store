import * as fs from "fs";
import * as path from "path";
import mammoth from "mammoth";

let cachedPolicyText: string | null = null;
let cachedPolicyHtml: string | null = null;
let cachedPolicyMtime: number = 0;
let cachedClauses: PolicyClause[] | null = null;

const POLICY_DIR = path.join(process.cwd(), "data");
const POLICY_FILE = path.join(POLICY_DIR, "company_policies.docx");

export interface PolicyClause {
  sectionId: string; // e.g. "SEC-1", "SEC-2.1", "SEC-3.3"
  parentSection?: string;
  title: string;
  isParent: boolean;
  content: string;
  summary: string;
  keywords: string[];
  relevanceScore?: number; // 0-100%
  matchConfidence?: "HIGH" | "MEDIUM" | "LOW";
  matchedTokens?: string[];
}

/**
 * Splits extracted policy text into both primary sections and granular sub-clauses for high-precision RAG
 */
function chunkPolicies(rawText: string): PolicyClause[] {
  const mainSectionRegex = /(?:^|\n\n)(\d+)\.\s+([^\n]+)\n\n([\s\S]*?)(?=(?:\n\n\d+\.\s+[^\n]+)|$)/g;
  let m;
  const clauses: PolicyClause[] = [];

  while ((m = mainSectionRegex.exec(rawText)) !== null) {
    const secNum = m[1];
    const secTitle = m[2].trim();
    const secBody = m[3].trim();
    const parentId = `SEC-${secNum}`;

    // Add main section clause
    clauses.push({
      sectionId: parentId,
      title: `Section ${secNum}: ${secTitle}`,
      isParent: true,
      content: `${secNum}. ${secTitle}\n${secBody}`,
      summary: secBody.slice(0, 180) + (secBody.length > 180 ? "..." : ""),
      keywords: [
        `section ${secNum}`,
        `sec-${secNum}`,
        secTitle.toLowerCase(),
        ...secTitle.toLowerCase().split(/[\s,&/-]+/).filter((w) => w.length > 2),
      ],
    });

    // Check for bulleted sub-clauses
    if (secBody.includes("•")) {
      const bulletItems = secBody.split(/•\s+/).filter((b) => b.trim().length > 0);
      bulletItems.forEach((bullet, idx) => {
        const trimmed = bullet.trim();
        const colonIdx = trimmed.indexOf(":");
        const subTitle = colonIdx !== -1 ? trimmed.slice(0, colonIdx).trim() : `Rule ${idx + 1}`;
        const subId = `${parentId}.${idx + 1}`;

        clauses.push({
          sectionId: subId,
          parentSection: parentId,
          title: `Section ${secNum}.${idx + 1}: ${subTitle}`,
          isParent: false,
          content: `Section ${secNum} (${secTitle}) Rule: ${trimmed}`,
          summary: trimmed,
          keywords: [
            subId.toLowerCase(),
            `section ${secNum}`,
            secTitle.toLowerCase(),
            subTitle.toLowerCase(),
            ...trimmed.toLowerCase().split(/[\s,&/():-]+/).filter((w) => w.length > 3),
          ],
        });
      });
    }

    // Check for numbered sub-clauses
    const numberedRegex = /(?:^|\n)(\d+)\.\s+([^\n]+(?:\n(?!\d+\.)[^\n]+)*)/g;
    let numMatch;
    const numItems: Array<{ index: string; text: string }> = [];
    while ((numMatch = numberedRegex.exec(secBody)) !== null) {
      numItems.push({ index: numMatch[1], text: numMatch[2].trim() });
    }

    if (numItems.length > 0) {
      numItems.forEach((item) => {
        const subId = `${parentId}.${item.index}`;
        const firstWords = item.text.split(" ").slice(0, 5).join(" ");
        clauses.push({
          sectionId: subId,
          parentSection: parentId,
          title: `Section ${secNum}.${item.index}: ${firstWords}...`,
          isParent: false,
          content: `Section ${secNum} (${secTitle}) Rule ${item.index}: ${item.text}`,
          summary: item.text,
          keywords: [
            subId.toLowerCase(),
            `section ${secNum}`,
            secTitle.toLowerCase(),
            ...item.text.toLowerCase().split(/[\s,&/():-]+/).filter((w) => w.length > 3),
          ],
        });
      });
    }
  }

  return clauses;
}

/**
 * Returns raw text and HTML of the company policies parsed from company_policies.docx
 */
export async function getCompanyPolicies(): Promise<{
  text: string;
  html: string;
  clauses: PolicyClause[];
  lastUpdated: string;
}> {
  try {
    if (!fs.existsSync(POLICY_FILE)) {
      return {
        text: "ApexStore Policy Document not found. Standard 30-day return policy applies.",
        html: "<p>Policy document not loaded.</p>",
        clauses: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    const stats = fs.statSync(POLICY_FILE);
    if (cachedPolicyText && cachedPolicyMtime === stats.mtimeMs && cachedClauses) {
      return {
        text: cachedPolicyText,
        html: cachedPolicyHtml || "<p></p>",
        clauses: cachedClauses,
        lastUpdated: stats.mtime.toISOString(),
      };
    }

    const buffer = fs.readFileSync(POLICY_FILE);
    const [rawTextResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }),
    ]);

    cachedPolicyText = rawTextResult.value.trim();
    cachedPolicyHtml = htmlResult.value.trim();
    cachedPolicyMtime = stats.mtimeMs;
    cachedClauses = chunkPolicies(cachedPolicyText);

    return {
      text: cachedPolicyText,
      html: cachedPolicyHtml,
      clauses: cachedClauses,
      lastUpdated: stats.mtime.toISOString(),
    };
  } catch (error) {
    console.error("Failed to parse company_policies.docx:", error);
    return {
      text: "Error reading policy document. Standard 30-day refund window applies.",
      html: "<p>Error reading policies.</p>",
      clauses: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Low-value stopwords & high-frequency general terms
const COMMON_STOPWORDS = new Set([
  "the", "and", "or", "for", "with", "can", "will", "are", "what", "how", "why",
  "item", "items", "return", "refund", "returns", "refunds", "policy", "policies",
  "customer", "customers", "within", "from", "have", "been", "get"
]);

/**
 * Clause-Level Semantic RAG Retriever with IDF Rare-Token Weighting:
 * Finds the top most relevant verified policy clauses for any given customer query or topic
 */
export async function searchPolicyRAG(query: string, maxResults: number = 3): Promise<PolicyClause[]> {
  const { clauses } = await getCompanyPolicies();
  if (!query || query.trim() === "") return clauses.slice(0, maxResults);

  const qLower = query.toLowerCase().trim();
  const tokens = qLower.split(/[\s,?.!'"()]+/).filter((t) => t.length > 2);

  // Compute document frequency for inverse frequency weighting
  const docFreq: Record<string, number> = {};
  for (const token of tokens) {
    let count = 0;
    for (const c of clauses) {
      if (c.content.toLowerCase().includes(token) || c.keywords.some((k) => k.includes(token))) {
        count++;
      }
    }
    docFreq[token] = count;
  }

  const scored = clauses.map((clause) => {
    let score = 0;
    const clauseTextLower = clause.content.toLowerCase();
    const matchedTokens: string[] = [];

    // Exact phrase match
    if (clauseTextLower.includes(qLower)) {
      score += 40;
      matchedTokens.push(qLower);
    }

    for (const token of tokens) {
      const isStopword = COMMON_STOPWORDS.has(token);
      const freq = docFreq[token] || 1;
      // High rarity boost (IDF): rare terms like "earbuds", "doa", "restocking", "gift" have high multipliers
      const idfMultiplier = isStopword ? 1 : Math.max(3, 20 - freq * 2);

      const regex = new RegExp(`\\b${token}`, "gi");
      const count = (clauseTextLower.match(regex) || []).length;
      if (count > 0) {
        score += Math.min(count, 3) * idfMultiplier * 2;
        matchedTokens.push(token);
      }

      if (clause.keywords.some((k) => k.includes(token))) {
        score += idfMultiplier * 1.5;
        matchedTokens.push(token);
      }

      if (clause.sectionId.toLowerCase() === token || clause.title.toLowerCase().includes(token)) {
        score += idfMultiplier * 2;
        matchedTokens.push(token);
      }
    }

    // Specific sub-clauses have higher pinpoint accuracy than broad parent headers
    if (!clause.isParent && score > 0) {
      score += 5;
    }

    const confidencePct = Math.min(99, Math.round(score * 2.5));
    const confidenceLevel: "HIGH" | "MEDIUM" | "LOW" =
      confidencePct >= 70 ? "HIGH" : confidencePct >= 40 ? "MEDIUM" : "LOW";

    return {
      clause,
      rawScore: score,
      relevanceScore: confidencePct,
      matchConfidence: confidenceLevel,
      matchedTokens: Array.from(new Set(matchedTokens)),
    };
  });

  scored.sort((a, b) => b.rawScore - a.rawScore);

  const matched = scored.filter((s) => s.rawScore > 0);
  const results = matched.length > 0 ? matched.slice(0, maxResults) : scored.slice(0, 2);

  return results.map((s) => ({
    ...s.clause,
    relevanceScore: s.relevanceScore,
    matchConfidence: s.matchConfidence,
    matchedTokens: s.matchedTokens,
  }));
}

/**
 * Strict Grounding Guardrail Evaluator:
 * Validates whether a proposed claim or refund decision has matching policy citations
 */
export async function verifyPolicyGrounding(
  claimText: string,
  sectionId?: string
): Promise<{
  grounded: boolean;
  confidenceScore: number;
  matchedClause?: PolicyClause;
  guardrailNote: string;
}> {
  const { clauses } = await getCompanyPolicies();
  if (!claimText) {
    return {
      grounded: false,
      confidenceScore: 0,
      guardrailNote: "Guardrail Failure: Empty claim text.",
    };
  }

  // If specific section ID provided, check direct match
  if (sectionId) {
    const clause = clauses.find(
      (c) => c.sectionId.toLowerCase() === sectionId.toLowerCase() || c.sectionId.toLowerCase().startsWith(sectionId.toLowerCase())
    );
    if (clause) {
      return {
        grounded: true,
        confidenceScore: 98,
        matchedClause: clause,
        guardrailNote: `Grounding Verified: Directly backed by ${clause.sectionId} (${clause.title}).`,
      };
    }
  }

  // Otherwise perform RAG match
  const searchResults = await searchPolicyRAG(claimText, 1);
  if (searchResults.length > 0 && (searchResults[0].relevanceScore || 0) >= 40) {
    return {
      grounded: true,
      confidenceScore: searchResults[0].relevanceScore || 75,
      matchedClause: searchResults[0],
      guardrailNote: `Grounding Verified: Supported by clause ${searchResults[0].sectionId} with ${searchResults[0].matchConfidence} confidence.`,
    };
  }

  return {
    grounded: false,
    confidenceScore: searchResults[0]?.relevanceScore || 10,
    matchedClause: searchResults[0],
    guardrailNote: "Guardrail Warning: Claim lacks sufficient grounding in company_policies.docx.",
  };
}

/**
 * Saves a new uploaded .docx policy file and invalidates cache
 */
export async function updatePolicyDocument(buffer: Buffer): Promise<{ success: boolean; error?: string }> {
  try {
    if (!fs.existsSync(POLICY_DIR)) {
      fs.mkdirSync(POLICY_DIR, { recursive: true });
    }

    const testResult = await mammoth.extractRawText({ buffer });
    if (!testResult.value || testResult.value.length < 20) {
      throw new Error("Invalid .docx file or empty policy document.");
    }

    fs.writeFileSync(POLICY_FILE, buffer);
    cachedPolicyText = null;
    cachedPolicyHtml = null;
    cachedPolicyMtime = 0;
    cachedClauses = null;

    return { success: true };
  } catch (err: any) {
    console.error("Error updating policy document:", err);
    return { success: false, error: err.message || "Failed to update policy" };
  }
}

/**
 * Validates that all required core policy clauses are present in the parsed Word document.
 * If any core clause is missing, automated refund decisioning must safely yield to manual admin review.
 */
export function validatePolicyIntegrity(clauses: PolicyClause[]): {
  valid: boolean;
  missingClauses: string[];
} {
  const REQUIRED_SECTIONS = [
    "SEC-1",
    "SEC-2.1",
    "SEC-2.2",
    "SEC-2.3",
    "SEC-2.4",
    "SEC-3.1",
    "SEC-3.2",
    "SEC-3.3",
    "SEC-3.4",
    "SEC-4.1",
    "SEC-4.2",
  ];

  if (!clauses || clauses.length === 0) {
    return { valid: false, missingClauses: REQUIRED_SECTIONS };
  }

  const present = new Set(clauses.map((c) => c.sectionId));
  const missing = REQUIRED_SECTIONS.filter((sec) => !present.has(sec));

  return {
    valid: missing.length === 0,
    missingClauses: missing,
  };
}
