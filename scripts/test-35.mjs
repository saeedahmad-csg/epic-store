import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { GoogleGenAI } from "@google/genai";

async function test35() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const testList = ["gemini-3.5-flash", "gemini-3.5-flash-preview", "gemini-3.8-flash"];

  for (const m of testList) {
    try {
      console.log(`Testing ${m}...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: "Hi",
      });
      console.log(`✅ SUCCESS with ${m}:`, res.text.trim());
    } catch (e) {
      console.log(`❌ ${m}:`, e.message);
    }
  }
}

test35();
