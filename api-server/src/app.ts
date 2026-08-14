import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { config } from "./lib/config";
import { createRateLimiter } from "./lib/rate-limit";

const app: Express = express();

// Baseline security headers for all API responses.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.removeHeader("X-Powered-By");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = config.corsOrigins;

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin / non-browser requests have no Origin header.
      if (!origin || allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  }),
);

// Cap request bodies to prevent abuse.
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

// A stricter limiter for ingest/error endpoints, a more lenient one for reads.
const writeLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
});
const readLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max * 5,
});

app.use("/api/events", writeLimiter);
app.use("/api/client-errors", writeLimiter);
app.use("/api", readLimiter);
app.use("/api", router);

// Centralized error handler (body size limits, CORS rejections, etc.).
app.use(
  (
    err: { status?: number; statusCode?: number; type?: string; message?: string } | null | undefined,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (res.headersSent) return;

    const status =
      err?.status ||
      err?.statusCode ||
      (err?.type === "entity.too.large" ? 413 : undefined) ||
      (err?.type === "entity.parse.failed" ? 400 : undefined);

    if (status && status < 500) {
      res.status(status).json({
        error:
          status === 413
            ? "Payload too large."
            : status === 400
              ? "Invalid request."
              : err?.message || "Bad request.",
      });
      return;
    }

    logger.error({ err }, "Request error");
    res.status(500).json({ error: "Internal server error" });
  },
);

app.disable("x-powered-by");

export default app;
