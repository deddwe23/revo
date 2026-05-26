import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// Security: Rate limiting middleware (simple in-memory implementation)
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 500;
const AUTH_RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const AUTH_RATE_LIMIT_MAX = 60;

const rateLimitMiddleware = (
  max = RATE_LIMIT_MAX,
  windowMs = RATE_LIMIT_WINDOW,
  keyPrefix = "global",
) => (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const ip = (req.ip || (req.socket?.remoteAddress as string | undefined)) ?? "unknown";
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }
  
  const times = requestCounts.get(key)!;
  const recentRequests = times.filter(t => now - t < windowMs);
  
  if (recentRequests.length >= max) {
    res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
    return res.status(429).json({ error: "Too many requests, please try again later" });
  }
  
  recentRequests.push(now);
  requestCounts.set(key, recentRequests);
  next();
};

// Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  );
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
          ip: req.ip,
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

// Security: CORS with whitelist
const allowedOrigins = [
  // Development
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:3000",
  // Production
  "https://revo-services-portfolio.vercel.app",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ origin }, "CORS blocked request");
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 3600,
}));

app.use(cookieParser());

// Security: Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Input validation and sanitization middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.body && typeof req.body === "object") {
    // Sanitize object values
    const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
      if (typeof obj !== "object" || obj === null) return obj as Record<string, unknown>;
      if (Array.isArray(obj)) return obj.map(item => sanitize(item as Record<string, unknown>)) as unknown as Record<string, unknown>;
      
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Prevent prototype pollution
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          continue;
        }
        
        if (typeof value === "string") {
          // Basic XSS prevention
          sanitized[key] = value
            .replace(/[<>]/g, "") // Remove angle brackets
            .trim();
        } else {
          sanitized[key] = sanitize(value as Record<string, unknown>);
        }
      }
      return sanitized;
    };
    
    req.body = sanitize(req.body);
  }
  next();
});

// Apply rate limiting
app.use("/api/", rateLimitMiddleware(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW, "api"));

// Apply stricter limits only to authentication mutation endpoints.
// This avoids blocking regular session checks (for example /auth/me).
app.use("/api/auth/send-otp", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "auth-send-email"));
app.use("/api/auth/send-whatsapp-otp", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "auth-send-wa"));
app.use("/api/auth/verify-otp", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "auth-verify"));
app.use("/api/customer/login", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-login"));
app.use("/api/customer/register", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-register"));
app.use("/api/customer/register/send-email-code", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-register-send-email"));
app.use("/api/customer/register/verify-email-code", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-register-verify-email"));
app.use("/api/customer/register/send-whatsapp-code", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-register-send-wa"));
app.use("/api/customer/register/verify-whatsapp-code", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-register-verify-wa"));
app.use("/api/customer/send-login-code", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-send-email"));
app.use("/api/customer/send-login-whatsapp-code", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-send-wa"));
app.use("/api/customer/verify-login-code", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-verify-email"));
app.use("/api/customer/verify-login-whatsapp-code", rateLimitMiddleware(AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW, "customer-verify-wa"));

// Route handler
app.use("/api", router);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err, path: req.path, method: req.method }, "Request error");
  
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS policy violation" });
  }

  res.status(500).json({ error: "Internal server error" });
});

export default app;
