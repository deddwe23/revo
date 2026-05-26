import { Router } from "express";
import crypto from "crypto";
import pkg from "pg";
import { isEmailConfigured, sendOtpEmail } from "../lib/email.js";
import { logger } from "../lib/logger.js";
import { normalizeSaudiPhone, sendOtpViaWhatsApp } from "../lib/whatsapp-otp.js";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const ADMIN_EMAIL = process.env["ADMIN_EMAIL"] || "re32vo@gmail.com";
const ADMIN_LOGIN_PHONE = process.env["ADMIN_LOGIN_PHONE"] || "0533170903";

const router = Router();

router.post("/auth/send-otp", async (req, res) => {
  try {
    const { email } = req.body as { email: string };
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || normalizedEmail !== ADMIN_EMAIL.toLowerCase()) {
      res.status(403).json({ error: "البريد الإلكتروني غير مصرح به" });
      return;
    }

    if (!isEmailConfigured()) {
      res.status(503).json({ error: "إرسال البريد غير مهيأ بعد. أضف GMAIL_APP_PASSWORD في ملف البيئة لتفعيل إرسال كود الدخول إلى بريدك." });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const sent = await sendOtpEmail(otp);

    if (!sent) {
      res.status(502).json({ error: "تعذر إرسال الكود إلى البريد. تحقق من إعدادات Gmail App Password ثم أعد المحاولة." });
      return;
    }

    await pool.query(
      `INSERT INTO otp_codes (code, expires_at) VALUES ($1, $2)`,
      [otp, expiresAt]
    );

    res.json({ success: true });
  } catch (err) {
    logger.error(err, "OTP error");
    res.status(500).json({ error: "حدث خطأ في إرسال الكود" });
  }
});

router.post("/auth/send-whatsapp-otp", async (req, res) => {
  try {
    const inputPhone = (req.body as { phone?: string })?.phone;
    const requestedPhone = normalizeSaudiPhone(inputPhone || ADMIN_LOGIN_PHONE);
    const allowedPhone = normalizeSaudiPhone(ADMIN_LOGIN_PHONE);

    if (!requestedPhone || requestedPhone !== allowedPhone) {
      res.status(403).json({ error: "رقم الإدارة غير مصرح به" });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const sent = await sendOtpViaWhatsApp({ to: requestedPhone, otp, purpose: "admin", preferredChannel: "web" });
    if (!sent.success) {
      res.status(502).json({ error: sent.error || "تعذر إرسال الكود على واتساب" });
      return;
    }

    await pool.query(`INSERT INTO otp_codes (code, expires_at) VALUES ($1, $2)`, [otp, expiresAt]);
    res.json({ success: true, channel: sent.mode, phone: requestedPhone });
  } catch (err) {
    logger.error(err, "WhatsApp admin OTP error");
    res.status(500).json({ error: "حدث خطأ في إرسال الكود على واتساب" });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { otp } = req.body as { otp: string };

    if (!otp) {
      res.status(400).json({ error: "الكود مطلوب" });
      return;
    }

    const result = await pool.query(
      `SELECT id FROM otp_codes WHERE code = $1 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [otp]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "الكود غير صحيح أو منتهي الصلاحية" });
      return;
    }

    await pool.query(`UPDATE otp_codes SET used = TRUE WHERE id = $1`, [result.rows[0].id]);

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO admin_sessions (token, expires_at) VALUES ($1, $2)`,
      [tokenHash, expiresAt]
    );

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.admin_token as string | undefined;
  if (token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await pool.query(`DELETE FROM admin_sessions WHERE token = $1`, [tokenHash]);
  }
  res.clearCookie("admin_token");
  res.json({ success: true });
});

router.get("/auth/me", async (req, res) => {
  const token = req.cookies?.admin_token as string | undefined;
  if (!token) { res.json({ authenticated: false }); return; }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const result = await pool.query(
    `SELECT id FROM admin_sessions WHERE token = $1 AND expires_at > NOW()`,
    [tokenHash]
  );

  res.json({ authenticated: result.rows.length > 0 });
});

export default router;
