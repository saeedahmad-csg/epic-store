import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import * as fs from "fs";
import * as path from "path";

async function generatePolicyDoc() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "ApexStore Global Retail - Customer Support & Return Policies",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          new Paragraph({
            text: "Document ID: POL-REF-2026-V3 | Effective Date: January 1, 2026 | Last Updated: October 2026",
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: "1. Overview & General Policy",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun(
                "ApexStore is committed to delivering premium quality products and world-class customer service. If you are not completely satisfied with your purchase, we offer fair and transparent return and refund procedures governed by this policy. All refund requests must be verified against verified order records from our official database."
              ),
            ],
            spacing: { after: 150 },
          }),

          new Paragraph({
            text: "2. Standard Return Windows & Timeframes",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Standard Electronics & Devices: ",
                bold: true,
              }),
              new TextRun(
                "Eligible for return or refund within 30 days from verified delivery date."
              ),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Opened Accessories & Peripherals: ",
                bold: true,
              }),
              new TextRun(
                "Eligible for return within 14 days from delivery date, subject to inspection."
              ),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Final Sale & Clearance Items: ",
                bold: true,
              }),
              new TextRun(
                "Items marked 'Final Sale' or discounted at 50% or higher are strictly non-refundable unless verified Defective on Arrival (DOA)."
              ),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Loyalty Customer Extension: ",
                bold: true,
              }),
              new TextRun(
                "Apex Gold Tier members receive an extended 45-day return window. Silver Tier members receive standard 30-day window with waived restocking fees."
              ),
            ],
            spacing: { after: 150 },
          }),

          new Paragraph({
            text: "3. Condition Guidelines & Eligibility Criteria",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Defective on Arrival (DOA) / Manufacturer Malfunction: ",
                bold: true,
              }),
              new TextRun(
                "100% full refund including original shipping charges. Return shipping label is complimentary. Customers must report DOA within 14 days of delivery."
              ),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Unopened / Change of Mind: ",
                bold: true,
              }),
              new TextRun(
                "100% refund of product purchase price. Must be in original factory seal and undamaged box. Return shipping is the responsibility of customer unless Silver/Gold member."
              ),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Opened Goods in Working Condition: ",
                bold: true,
              }),
              new TextRun(
                "Refundable within policy window minus a standard $5.00 restocking fee to cover repackaging and recertification."
              ),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Accidental Damage / Misuse / Liquid Damage: ",
                bold: true,
              }),
              new TextRun(
                "Strictly ineligible for refund. Such items fall under manufacturer warranty repair procedures, not return refunds."
              ),
            ],
            spacing: { after: 150 },
          }),

          new Paragraph({
            text: "4. Strictly Non-Refundable Items",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun(
                "The following items cannot be returned or refunded under any condition once shipped:\n" +
                  "1. Digital gift cards, downloadable software keys, and game vouchers.\n" +
                  "2. Personal hygiene electronics (such as in-ear headphones and earbuds) if the sanitary package seal has been broken.\n" +
                  "3. Personalized or custom-engraved merchandise.\n" +
                  "4. Products missing original serial number or tamper tags."
              ),
            ],
            spacing: { after: 150 },
          }),

          new Paragraph({
            text: "5. Refund Approval & Automated Email Process",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun(
                "Once a refund request is evaluated by our AI support agent and approved (either via human-in-the-loop admin review or automated eligibility verification), the following automated steps occur:\n" +
                  "1. The refund status is recorded and updated in the official database (Google Sheets).\n" +
                  "2. An automated Refund Confirmation Email is dispatched immediately to the customer's registered email address, specifying the Refund ID, approved refund amount, order reference, and payment return details.\n" +
                  "3. Funds are issued back to the original method of payment (Credit Card, PayPal, or Store Credit) within 3 to 5 business days."
              ),
            ],
            spacing: { after: 150 },
          }),

          new Paragraph({
            text: "6. Discount & Promotion Rules",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun(
                "Promotional discounts, coupon codes, and bundle savings are automatically calculated and logged in the product inventory database. In the event of a partial refund on a bundled purchase, the refund amount will be prorated according to the net discounted item price, not the original retail MSRP."
              ),
            ],
            spacing: { after: 150 },
          }),
        ],
      },
    ],
  });

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const filePath = path.join(outDir, "company_policies.docx");
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Successfully generated Word policy document at: ${filePath}`);
}

generatePolicyDoc().catch((err) => {
  console.error("Error generating policy docx:", err);
  process.exit(1);
});
