import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { seedGoogleSheets, checkGoogleSheetsConnection } from "../src/lib/googleSheets";

async function main() {
  console.log("==================================================");
  console.log("   APEXSTORE GOOGLE SHEETS INITIALIZATION TOOL   ");
  console.log("==================================================");

  console.log("1. Checking Google Sheets Connection...");
  const conn = await checkGoogleSheetsConnection();

  if (!conn.connected) {
    console.warn("⚠️  Google Sheets connection failed:", conn.error);
    console.log("\nMake sure your .env.local file contains:");
    console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com");
    console.log("GOOGLE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\"");
    console.log("GOOGLE_SHEET_ID=your-google-sheet-id\n");
    console.log("Also ensure you shared the Google Sheet with the Service Account email as Editor!");
    process.exit(1);
  }

  console.log(`✅ Connected to Google Sheet: "${conn.sheetTitle}" (ID: ${conn.sheetId})`);
  console.log("2. Seeding required tabs: Products, Orders, Customers, RefundRequests, InteractionsLog...");

  const res = await seedGoogleSheets();
  if (res.success) {
    console.log("🎉", res.message);
  } else {
    console.error("❌ Seeding failed:", res.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
