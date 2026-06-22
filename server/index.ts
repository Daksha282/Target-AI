import "dotenv/config";
import { createApp } from "./app";

const PORT = process.env.PORT ?? 8787;

// Local development entry. On Vercel the same app is served by api/index.ts
// as a serverless function instead of a long-running listener.
createApp().listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
