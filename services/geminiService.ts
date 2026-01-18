import { GoogleGenAI } from "@google/genai";
import { Entry } from "./types";

const getClient = () => {
    // Only initialize if key exists to prevent crashes in environments without keys
    if (!process.env.API_KEY) return null;
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const GeminiService = {
  generateInsight: async (entries: Entry[], period: string) => {
    if (!navigator.onLine) {
        return "You are currently offline. Please connect to the internet to generate AI insights.";
    }

    const ai = getClient();
    if (!ai) return "AI Insights unavailable (Missing API Key).";

    // Prepare anonymized data summary
    const summary = entries.map(e => ({
      date: new Date(e.timestamp).toDateString(),
      duration: e.duration,
      intensity: e.intensity,
      orgasm: e.orgasm,
      tags: e.tags
    }));

    const prompt = `
      Analyze the following anonymized personal self-pleasure logs for the period: ${period}.
      Data: ${JSON.stringify(summary)}

      Provide a short, neutral, clinical, and non-judgmental insight (max 100 words).
      Focus on patterns in timing, duration, intensity, or tag correlations.
      Do not use explicit language. Use terms like "sessions", "frequency", "intensity".
      Directly address the user as "You".
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "No insights available at this time.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Unable to generate insights at this moment.";
    }
  }
};