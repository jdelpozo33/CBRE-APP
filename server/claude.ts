import Anthropic from "@anthropic-ai/sdk";
import { modelConfig, supportsServerFallback } from "./config.ts";

// Reads ANTHROPIC_API_KEY from the environment. The SDK retries 429 / 5xx / connection
// errors with exponential backoff on its own, so no hand-rolled retry loop is needed.
// One retry: long structured answers can take a minute or more, so repeated timeouts would
// make the broker wait several minutes before the fallback.
export const anthropic = new Anthropic({ maxRetries: 1 });

// High-speed In-memory Cache to eliminate repeated queries and prevent saturation
interface CacheEntry {
  data: any;
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached(key: string, data: any): void {
  if (memoryCache.size > 200) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export interface ClaudeCallOptions {
  speedMode?: "turbo" | "balanced";
  system?: string;
  // Ask for a single JSON object back; markdown fences are stripped from the text.
  json?: boolean;
  // Enable Claude's server-side web search tool for live market research.
  webSearch?: boolean;
  // Most web searches Claude may run for this request (default 10).
  maxSearches?: number;
  timeoutMs?: number;
}

export interface ClaudeCallResult {
  text: string;
  modelUsed: string;
  executionTimeMs: number;
  sources: { title: string; url: string }[];
  searchQueries: string[];
}

// The dynamic-filtering web search tool needs an Opus or Sonnet model; others use the basic one.
const webSearchTool = (model: string, maxUses: number) =>
  /^claude-(opus|sonnet|fable)-/.test(model)
    ? { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: maxUses }
    : { type: "web_search_20250305" as const, name: "web_search" as const, max_uses: maxUses };

const JSON_INSTRUCTION =
  "Respond with a single valid JSON object only. No markdown code fences, no commentary before or after the JSON.";

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

/**
 * Claude execution engine:
 * 1. Speed modes: Turbo uses the configured fast model at effort "low"; Standard uses the main model at "medium"
 * 2. Streaming, so long answers (a full debrief can take 2+ minutes) aren't cut off, with an
 *    overall time cap so a stalled upstream never hangs the UI
 * 3. SDK-managed retries with backoff on 429 (rate limit) / 5xx (overloaded)
 * 4. Server-side refusal fallback ("default" mode) on models that support it
 * 5. Web search via Claude's server tool, with citations collected as sources
 */
export async function executeClaudeCall(
  prompt: string,
  options: ClaudeCallOptions = {}
): Promise<ClaudeCallResult> {
  const startTime = Date.now();
  const speedMode = options.speedMode || "turbo";
  const timeoutMs = options.timeoutMs ?? 300000;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);

  const system = [options.system, options.json ? JSON_INSTRUCTION : undefined]
    .filter(Boolean)
    .join("\n\n");

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  const textParts: string[] = [];
  const sources: { title: string; url: string }[] = [];
  const searchQueries: string[] = [];
  const model = speedMode === "turbo" ? modelConfig.turbo : modelConfig.standard;
  let modelUsed = model;

  try {
    // Server tools (web search) can return pause_turn on long turns; resume a few times.
    for (let turn = 0; turn < 3; turn++) {
      const response = await anthropic.beta.messages
        .stream(
          {
            model,
            max_tokens: 16000,
            output_config: { effort: speedMode === "turbo" ? "low" : "medium" },
            ...(supportsServerFallback(model)
              ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
              : {}),
            ...(system ? { system } : {}),
            ...(options.webSearch ? { tools: [webSearchTool(model, options.maxSearches ?? 10)] } : {}),
            messages,
          },
          { signal: abort.signal }
        )
        .finalMessage();

      modelUsed = response.model;

      if (response.stop_reason === "refusal") {
        const category = response.stop_details?.category ?? "unspecified";
        throw new Error(`Claude declined this request (category: ${category})`);
      }

      for (const block of response.content) {
        if (block.type === "text") {
          textParts.push(block.text);
        } else if (block.type === "server_tool_use" && block.name === "web_search") {
          const query = (block.input as { query?: string })?.query;
          if (query) searchQueries.push(query);
        } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const result of block.content) {
            if (!sources.some((s) => s.url === result.url)) {
              sources.push({ title: result.title || new URL(result.url).hostname, url: result.url });
            }
          }
        }
      }

      if (response.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: response.content });
    }
  } finally {
    clearTimeout(timer);
  }

  const text = textParts.join("").trim();
  return {
    text: options.json ? stripJsonFences(text) : text,
    modelUsed,
    executionTimeMs: Date.now() - startTime,
    sources,
    searchQueries,
  };
}
