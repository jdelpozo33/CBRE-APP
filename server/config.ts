import dotenv from "dotenv";

dotenv.config();

// Claude models, configurable per deployment. Turbo trades some quality for speed.
export const modelConfig = {
  standard: process.env.CLAUDE_MODEL || "claude-opus-5-5",
  turbo: process.env.CLAUDE_TURBO_MODEL || "claude-haiku-5-5",
};

// Models that support the server-side refusal fallback ("fallbacks": "default").
export const supportsServerFallback = (model: string) =>
  /^claude-(opus|fable|sonnet)-/.test(model);
