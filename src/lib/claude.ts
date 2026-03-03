// @module claude — Claude API client for post analysis
// App Spec Module 3 — LLM Analysis Engine (Anthropic)

import Anthropic from "@anthropic-ai/sdk";
import {
  buildSystemPrompt,
  buildUserMessage,
  parseAnalysisResponse,
  ANALYSIS_PROMPT_VERSION,
  type PostForAnalysis,
  type PostAnalysisResult,
} from "@/lib/analysis-prompt";

const MODEL = "claude-sonnet-4-20250514";

export interface AnalysisResponse {
  results: PostAnalysisResult[];
  raw: unknown;
  model: string;
  promptVersion: string;
}

/** Analyze a batch of posts using Claude */
export async function analyzeWithClaude(
  apiKey: string,
  posts: PostForAnalysis[]
): Promise<AnalysisResponse> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: buildUserMessage(posts),
      },
    ],
  });

  // Extract text content from response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  const results = parseAnalysisResponse(textBlock.text);

  return {
    results,
    raw: response,
    model: MODEL,
    promptVersion: ANALYSIS_PROMPT_VERSION,
  };
}

/** Test Claude API connectivity with a minimal request */
export async function testClaudeConnection(
  apiKey: string
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: MODEL,
      max_tokens: 10,
      messages: [{ role: "user", content: "Reply with just the word OK." }],
    });
    return {
      success: true,
      message: `Connected to ${MODEL}`,
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
