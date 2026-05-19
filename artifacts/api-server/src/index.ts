import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapDatabase } from "./lib/bootstrap-db.js";
import { ensureWhatsAppWebAutoStart } from "./lib/whatsapp-web.js";

const rawPort = process.env["PORT"] ?? "3000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function listenWithPortFallback(initialPort: number, maxAttempts = 5) {
  let candidatePort = initialPort;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(candidatePort);

        server.once("listening", () => {
          resolve();
        });

        server.once("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            reject(err);
            return;
          }
          reject(err);
        });
      });

      return candidatePort;
    } catch (err) {
      const errno = err as NodeJS.ErrnoException;
      if (errno.code === "EADDRINUSE") {
        logger.warn({ port: candidatePort }, "Port in use, trying next port");
        candidatePort += 1;
        continue;
      }
      throw err;
    }
  }

  throw new Error(`No available port found starting from ${initialPort}`);
}

void (async () => {
  try {
    await bootstrapDatabase();

    const actualPort = await listenWithPortFallback(port);
    logger.info({ port: actualPort }, "Server listening");
    ensureWhatsAppWebAutoStart();
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
})();
