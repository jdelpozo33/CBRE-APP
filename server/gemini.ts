import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";

export { ThinkingLevel };

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

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

export interface ResilientCallOptions {
  model?: string;
  speedMode?: "turbo" | "balanced";
  systemInstruction?: string;
  responseMimeType?: string;
  tools?: any[];
  temperature?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Resilient Gemini execution engine designed for maximum speed & anti-saturation:
 * 1. ThinkingLevel.LOW / MINIMAL: Stops model from burning 5-10s on internal reasoning tokens
 * 2. Hard Per-Attempt Timeout Guard (Default 12s): Prevents indefinite hanging when upstream is slow
 * 3. Automatic Jittered Exponential Backoff on 429 (Resource Exhausted) / 503 (Overloaded)
 * 4. Automatic Model Fallback: Switches to ultra-high-throughput 'gemini-3.1-flash-lite' if primary hits saturation
 * 5. Micro-telemetry: Emits execution latency and model attribution
 */
export async function executeResilientGeminiCall(
  prompt: string,
  options: ResilientCallOptions = {}
) {
  const startTime = Date.now();
  const speedMode = options.speedMode || "turbo";
  const timeoutMs = options.timeoutMs ?? (speedMode === "turbo" ? 10000 : 15000);

  // In turbo mode, use gemini-3.1-flash-lite for ultra-fast generation and highest RPM/TPM ceilings
  // In balanced mode, use gemini-3.8-flash with ThinkingLevel.LOW
  let preferredModel = options.model;
  if (!preferredModel) {
    preferredModel = speedMode === "turbo" ? "gemini-3.1-flash-lite" : "gemini-3.8-flash";
  }

  const maxRetries = options.maxRetries ?? 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // If retrying due to saturation or timeout, route immediately to gemini-3.1-flash-lite
    const currentModel =
      attempt > 0 && preferredModel !== "gemini-3.1-flash-lite"
        ? "gemini-3.1-flash-lite"
        : preferredModel;

    try {
      const config: any = {};
      if (options.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }
      if (options.tools) {
        config.tools = options.tools;
      }
      if (options.temperature !== undefined) {
        config.temperature = options.temperature;
      }

      // Eliminate reasoning latency
      if (currentModel === "gemini-3.1-flash-lite") {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      } else {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      // Hard timeout guard per attempt to prevent infinite hanging
      const callPromise = ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Gemini call timed out after ${timeoutMs}ms on ${currentModel}`)),
          timeoutMs
        )
      );

      const response = await Promise.race([callPromise, timeoutPromise]);

      const elapsedMs = Date.now() - startTime;
      return {
        response,
        text: response.text || "",
        modelUsed: currentModel,
        executionTimeMs: elapsedMs,
        attempts: attempt + 1,
      };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || 0;
      const errStr = String(err?.message || "").toLowerCase();
      const isRateLimit = status === 429 || errStr.includes("resource_exhausted") || errStr.includes("quota");
      const isOverloaded = status === 503 || errStr.includes("unavailable") || errStr.includes("overloaded");
      const isTimeout = errStr.includes("timed out") || errStr.includes("deadline_exceeded");

      if ((isRateLimit || isOverloaded || isTimeout) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 450 + Math.floor(Math.random() * 200);
        console.warn(
          `[Anti-Saturation] Gemini issue (${err?.message}). Retrying in ${backoffMs}ms with model ${
            attempt === 0 ? "gemini-3.1-flash-lite" : currentModel
          }...`
        );
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}


