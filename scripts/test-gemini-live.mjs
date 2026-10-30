import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Testing GEMINI_API_KEY:", apiKey ? `${apiKey.slice(0, 10)}...` : "None");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Say 'Hello from Gemini Live Agent!'",
    });
    console.log("✅ Gemini API Connected Successfully! Response:", response.text);
  } catch (err) {
    console.error("❌ Gemini API Connection Failed:", err.message);
  }
}

testGemini();
