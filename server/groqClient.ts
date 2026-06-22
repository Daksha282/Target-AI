import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Lazily builds the Groq client on first use. Building it at module load makes
 * the entire serverless function crash at import (FUNCTION_INVOCATION_FAILED)
 * when GROQ_API_KEY is missing — before any route runs. Deferring construction
 * lets the route's try/catch return a clean JSON 500 instead.
 */
export function getGroqClient(): OpenAI {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not set in the server environment. On Vercel: add it under " +
        "Settings → Environment Variables, then redeploy so the new deployment picks it up."
    );
  }
  client ??= new OpenAI({
    baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
  });
  return client;
}

export const GROQ_MODEL =
  process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
