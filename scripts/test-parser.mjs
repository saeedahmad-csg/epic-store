import * as fs from "fs";
import * as path from "path";
import mammoth from "mammoth";

const POLICY_FILE = path.join(process.cwd(), "data", "company_policies.docx");

function chunkDocument(rawText) {
  const mainSectionRegex = /(?:^|\n\n)(\d+)\.\s+([^\n]+)\n\n([\s\S]*?)(?=(?:\n\n\d+\.\s+[^\n]+)|$)/g;
  let m;
  const clauses = [];

  while ((m = mainSectionRegex.exec(rawText)) !== null) {
    const secNum = m[1];
    const secTitle = m[2].trim();
    const secBody = m[3].trim();
    const parentId = `SEC-${secNum}`;

    clauses.push({
      sectionId: parentId,
      title: `Section ${secNum}: ${secTitle}`,
      isParent: true,
      content: `${secNum}. ${secTitle}\n${secBody}`,
      summary: secBody.slice(0, 180) + (secBody.length > 180 ? "..." : ""),
      keywords: [
        `section ${secNum}`,
        secTitle.toLowerCase(),
        ...secTitle.toLowerCase().split(/[\s,&/-]+/).filter((w) => w.length > 2),
      ],
    });

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

    const numberedRegex = /(?:^|\n)(\d+)\.\s+([^\n]+(?:\n(?!\d+\.)[^\n]+)*)/g;
    let numMatch;
    const numItems = [];
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
          content: `Section ${secNum} (${secTitle}) Non-Refundable Rule: ${item.text}`,
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

const COMMON_STOPWORDS = new Set([
  "the", "and", "or", "for", "with", "can", "will", "are", "what", "how", "why",
  "item", "items", "return", "refund", "returns", "refunds", "policy", "policies",
  "customer", "customers", "within", "from", "have", "been", "get"
]);

function searchPolicyRAG(query, clauses) {
  if (!query || !query.trim()) return clauses.slice(0, 5);

  const qLower = query.toLowerCase().trim();
  const tokens = qLower.split(/[\s,?.!'"()]+/).filter((t) => t.length > 2);

  // Compute document frequency for inverse frequency weighting
  const docFreq = {};
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
    const matchedTokens = [];

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
    const confidenceLevel = confidencePct >= 70 ? "HIGH" : confidencePct >= 40 ? "MEDIUM" : "LOW";

    return {
      clause,
      rawScore: score,
      relevanceScore: confidencePct,
      matchConfidence: confidenceLevel,
      matchedTokens: Array.from(new Set(matchedTokens)),
    };
  });

  scored.sort((a, b) => b.rawScore - a.rawScore);

  return scored
    .filter((s) => s.rawScore > 0)
    .slice(0, 3)
    .map((s) => ({
      ...s.clause,
      relevanceScore: s.relevanceScore,
      matchConfidence: s.matchConfidence,
      matchedTokens: s.matchedTokens,
    }));
}

async function run() {
  const buffer = fs.readFileSync(POLICY_FILE);
  const rawTextResult = await mammoth.extractRawText({ buffer });
  const clauses = chunkDocument(rawTextResult.value.trim());

  const queries = [
    "Can I return opened earbuds?",
    "smartwatch arrived with a cracked screen DOA",
    "What is the return window for Gold tier customers?",
    "How much is the restocking fee for opened box?",
    "When will I get my refund confirmation email?",
  ];

  for (const q of queries) {
    console.log(`\n========================================`);
    console.log(`QUERY: "${q}"`);
    const results = searchPolicyRAG(q, clauses);
    results.forEach((r, idx) => {
      console.log(`  #${idx + 1} [${r.sectionId}] ${r.title}`);
      console.log(`     Confidence: ${r.matchConfidence} (${r.relevanceScore}%) | Matched: ${r.matchedTokens.join(", ")}`);
      console.log(`     Snippet: "${r.content.slice(0, 110)}..."`);
    });
  }
}

run();
