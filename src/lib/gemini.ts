// @module gemini — Gemini API client for post analysis
// App Spec Module 3 — LLM Analysis Engine (Google)

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildSystemPrompt,
  buildUserMessage,
  parseAnalysisResponse,
  ANALYSIS_PROMPT_VERSION,
  type PostForAnalysis,
  type PostAnalysisResult,
} from "@/lib/analysis-prompt";

const DEFAULT_MODEL = "gemini-3-pro-preview";

export interface AnalysisResponse {
  results: PostAnalysisResult[];
  raw: unknown;
  model: string;
  promptVersion: string;
}

/** Analyze a batch of posts using Gemini */
export async function analyzeWithGemini(
  apiKey: string,
  posts: PostForAnalysis[],
  modelName?: string
): Promise<AnalysisResponse> {
  const useModel = modelName || DEFAULT_MODEL;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: useModel,
    systemInstruction: buildSystemPrompt(),
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(buildUserMessage(posts));
  const response = result.response;
  const text = response.text();

  const results = parseAnalysisResponse(text);

  return {
    results,
    raw: { text, candidates: response.candidates },
    model: useModel,
    promptVersion: ANALYSIS_PROMPT_VERSION,
  };
}

/** Test Gemini API connectivity with a minimal request */
export async function testGeminiConnection(
  apiKey: string,
  modelName?: string
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const useModel = modelName || DEFAULT_MODEL;
  const start = Date.now();
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: useModel });
    await model.generateContent("Reply with just the word OK.");
    return {
      success: true,
      message: `Connected to ${useModel}`,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}
