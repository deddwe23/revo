import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapDatabase } from "./lib/bootstrap-db.js";
import { ensureWhatsAppWebAutoStart } from "./lib/whatsapp-web.js";

const rawPort = process.env["PORT"] ?? "3000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Validate required environment variables
function validateEnvironmentVariables(): void {
  const required = ["DATABASE_URL"];
  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(", ")}`;
    logger.error({ missing }, error);
    throw new Error(error);
  }

  // Warn about optional but recommended variables
  const optional = ["ADMIN_EMAIL", "ADMIN_LOGIN_PHONE"];
  for (const envVar of optional) {
    if (!process.env[envVar]) {
      logger.warn({ envVar }, `Optional environment variable not set: ${envVar}`);
    }
  }
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
    validateEnvironmentVariables();
    await bootstrapDatabase();

    const actualPort = await listenWithPortFallback(port);
    logger.info({ port: actualPort }, "Server listening");
    ensureWhatsAppWebAutoStart();
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
})();
