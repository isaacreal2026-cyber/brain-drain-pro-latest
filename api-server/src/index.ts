import http from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { config } from "./lib/config";

const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      env: config.nodeEnv,
      corsOrigins: config.corsOrigins,
      supabase: config.supabase.isConfigured ? "configured" : "not-configured",
    },
    "Server listening",
  );
});

// Health/Readiness signal: stop accepting new connections and let in-flight
// requests finish when the platform asks us to shut down (SIGTERM/SIGINT).
let isShuttingDown = false;
function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Shutdown signal received, closing server");

  server.close((err) => {
    if (err) {
      logger.error({ err }, "Error during server close");
      process.exit(1);
    }
    logger.info("Server closed cleanly");
    process.exit(0);
  });

  // Force-exit if connections linger beyond the deadline.
  setTimeout(() => {
    logger.warn("Forcing shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
