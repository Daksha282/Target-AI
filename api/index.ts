import { createApp } from "../server/app";

// Vercel serverless entry. An Express app is itself a (req, res) handler, so
// exporting it lets Vercel route every /api/* request (see vercel.json) through
// the exact same router used by the local dev server. GROQ_API_KEY is read from
// the Vercel project's environment variables — it never reaches the browser.
export default createApp();
