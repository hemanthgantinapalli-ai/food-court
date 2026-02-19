import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/database.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) =>
  res.json({ status: "FoodCourt API running" })
);

app.listen(5000, () =>
  console.log("🚀 Backend running on port 5000")
);
