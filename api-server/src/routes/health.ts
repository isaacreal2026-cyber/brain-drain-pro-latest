import { Router, type IRouter } from "express";
import { z } from "zod";
import { config } from "../lib/config";

const HealthCheckResponse = z.object({
  status: z.string(),
  uptime: z.number(),
  timestamp: z.string(),
  supabase: z.enum(["configured", "not-configured"]),
  env: z.string(),
});

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    supabase: config.supabase.isConfigured ? "configured" : "not-configured",
    env: config.nodeEnv,
  });
  res.json(data);
});

export default router;
