import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.8-flash", "gemini-2.0-flash-exp"];

  for (const model of candidateModels) {
    try {
      console.log(`Testing model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: "Say 'Hello from live agent!'",
      });
      console.log(`✅ SUCCESS with ${model}:`, response.text.trim());
      return model;
    } catch (err) {
      console.log(`❌ Failed with ${model}:`, err.message?.slice(0, 100));
    }
  }
}

testModels();
