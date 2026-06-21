import "dotenv/config";
import express from "express";
import cors from "cors";
import recommendRouter from "./recommend";

const app = express();
const PORT = process.env.PORT ?? 8787;

app.use(cors());
app.use(express.json());

// Recommend router handles /recommend internally → full path: POST /api/recommend
app.use("/api", recommendRouter);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
