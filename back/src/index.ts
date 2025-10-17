import "dotenv/config";
import express from "express";
import cors from "cors";
import pino from "pino";

const app = express();
const log = pino();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => log.info(`API server started on :${port}`));