import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend runs on :5173, backend on :8787.
// All /api requests are proxied to the Express server so the
// browser never sees the LLM key (Layer 2 stays server-side).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
