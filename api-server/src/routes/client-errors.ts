import { Router, type IRouter } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const ClientErrorSchema = z.object({
  message: z.string().min(1).max(2000),
  name: z.string().max(120).optional(),
  stack: z.string().max(8000).optional(),
  source: z.string().max(500).optional(),
  lineno: z.number().int().nonnegative().optional(),
  colno: z.number().int().nonnegative().optional(),
  route: z.string().max(300).optional(),
  at: z.number().int().positive().optional(),
});

const router: IRouter = Router();

/**
 * Receives uncaught frontend errors. We intentionally do not persist PII and
 * cap payload sizes; this is a signal channel for production monitoring.
 */
router.post("/client-errors", (req, res) => {
  const parsed = ClientErrorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid client error payload" });
    return;
  }

  logger.error({ clientError: parsed.data }, "Client error reported");
  res.status(202).json({ accepted: true });
});

export default router;
