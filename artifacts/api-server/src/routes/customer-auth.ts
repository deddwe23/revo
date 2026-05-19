import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pkg from "pg";
import { isEmailConfigured, sendCustomerLoginCodeEmail } from "../lib/email.js";
import { runAutomationTrigger } from "../lib/automation.js";
import { normalizeSaudiPhone, sendOtpViaWhatsApp } from "../lib/whatsapp-otp.js";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const router = Router();

const REG_CODE_TTL_MS = 10 * 60 * 1000;
const REG_VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000;

type CustomerLookupRow = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  password_hash?: string;
};

type RegisterVerificationState = {
  email: string;
  phone: string;
  emailCode: string | null;
  phoneCode: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  expiresAt: number;
};

const registerVerificationStore = new Map<string, RegisterVerificationState>();
const registerVerifiedPhoneTokenStore = new Map<string, { phone: string; expiresAt: number }>();

function createRegisterVerificationToken(phone: string) {
  const token = crypto.randomBytes(24).toString("hex");
  registerVerifiedPhoneTokenStore.set(token, {
    phone: normalizeSaudiPhone(phone),
    expiresAt: Date.now() + REG_VERIFICATION_TOKEN_TTL_MS,
  });
  return token;
}

function consumeRegisterVerificationToken(token: string, expectedPhone: string) {
  const current = registerVerifiedPhoneTokenStore.get(token);
  if (!current) return false;
  registerVerifiedPhoneTokenStore.delete(token);
  if (Date.now() > current.expiresAt) return false;
  return current.phone === normalizeSaudiPhone(expectedPhone);
}

function emailStateKey(email: string) {
  return `email:${email.toLowerCase().trim()}`;
}

function phoneStateKey(phone: string) {
  return `phone:${normalizeSaudiPhone(phone)}`;
}

function phoneCandidates(input: string) {
  const normalized = normalizeSaudiPhone(input);
  const digits = String(normalized || "").replace(/[^0-9]/g, "");
  const set = new Set<string>();
  if (digits) {
    set.add(digits);
    if (digits.startsWith("966") && digits.length > 3) set.add(`0${digits.slice(3)}`);
    if (digits.startsWith("0") && digits.length > 1) set.add(`966${digits.slice(1)}`);
  }
  return [...set];
}

async function findCustomerByIdentifier(identifier: string, options?: { includePassword?: boolean }) {
  const value = identifier?.trim();
  if (!value) return null;

  const includePassword = Boolean(options?.includePassword);
  const fields = includePassword
    ? "id, email, full_name, phone, password_hash"
    : "id, email, full_name, phone";

  if (value.includes("@")) {
    const normalizedEmail = value.toLowerCase();
    const result = await pool.query(
      `SELECT ${fields} FROM customers WHERE email = $1 LIMIT 1`,
      [normalizedEmail],
    );
    return (result.rows[0] as CustomerLookupRow | undefined) ?? null;
  }

  const candidates = phoneCandidates(value);
  if (candidates.length === 0) return null;

  const result = await pool.query(
    `SELECT ${fields}
     FROM customers
     WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY($1::text[])
     LIMIT 1`,
    [candidates],
  );

  return (result.rows[0] as CustomerLookupRow | undefined) ?? null;
}

async function ensureNoExistingCustomer(email: string, phone: string) {
  const byEmail = await pool.query(`SELECT id FROM customers WHERE email = $1 LIMIT 1`, [email]);
  if (byEmail.rows.length > 0) {
    return { ok: false as const, error: "البريد مستخدم بالفعل" };
  }

  const phoneDigits = phoneCandidates(phone);
  if (phoneDigits.length > 0) {
    const byPhone = await pool.query(
      `SELECT id
       FROM customers
       WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY($1::text[])
       LIMIT 1`,
      [phoneDigits],
    );

    if (byPhone.rows.length > 0) {
      return { ok: false as const, error: "رقم الجوال مستخدم بالفعل" };
    }
  }

  return { ok: true as const };
}

async function ensureEmailNotUsed(email: string) {
  const byEmail = await pool.query(`SELECT id FROM customers WHERE email = $1 LIMIT 1`, [email]);
  return byEmail.rows.length === 0;
}

async function ensurePhoneNotUsed(phone: string) {
  const phoneDigits = phoneCandidates(phone);
  if (phoneDigits.length === 0) return false;
  const byPhone = await pool.query(
    `SELECT id
     FROM customers
     WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY($1::text[])
     LIMIT 1`,
    [phoneDigits],
  );
  return byPhone.rows.length === 0;
}

function getRegisterStateByKey(key: string) {
  const current = registerVerificationStore.get(key);
  if (!current) return null;
  if (Date.now() > current.expiresAt) {
    registerVerificationStore.delete(key);
    return null;
  }
  return current;
}

function getRegisterState(email: string) {
  return getRegisterStateByKey(emailStateKey(email));
}

function getRegisterStateByPhone(phone: string) {
  return getRegisterStateByKey(phoneStateKey(phone));
}

function upsertRegisterState(email: string, phone: string) {
  const eKey = emailStateKey(email);
  const pKey = phoneStateKey(phone);
  const existing = getRegisterStateByKey(eKey) || getRegisterStateByKey(pKey);

  const next: RegisterVerificationState = {
    email: email.toLowerCase().trim(),
    phone,
    emailCode: existing?.emailCode ?? null,
    phoneCode: existing?.phoneCode ?? null,
    emailVerified: existing?.emailVerified ?? false,
    phoneVerified: existing?.phoneVerified ?? false,
    expiresAt: Date.now() + REG_CODE_TTL_MS,
  };

  registerVerificationStore.set(eKey, next);
  registerVerificationStore.set(pKey, next);
  return next;
}

function upsertRegisterStateByPhone(phone: string) {
  const normalizedPhone = normalizeSaudiPhone(phone);
  const pKey = phoneStateKey(normalizedPhone);
  const existing = getRegisterStateByKey(pKey);
  const next: RegisterVerificationState = {
    email: existing?.email || "",
    phone: normalizedPhone,
    emailCode: existing?.emailCode ?? null,
    phoneCode: existing?.phoneCode ?? null,
    emailVerified: existing?.emailVerified ?? false,
    phoneVerified: existing?.phoneVerified ?? false,
    expiresAt: Date.now() + REG_CODE_TTL_MS,
  };
  registerVerificationStore.set(pKey, next);
  return next;
}

// Check if email exists
router.post("/customer/check-email", async (req, res) => {
  const { email } = req.body as { email: string };
  if (!email) {
    res.status(400).json({ error: "البريد مطلوب" });
    return;
  }
  const result = await pool.query(`SELECT id FROM customers WHERE email = $1`, [email.toLowerCase()]);
  res.json({ exists: result.rows.length > 0 });
});

// Check identifier (email or phone)
router.post("/customer/check-identifier", async (req, res) => {
  const { identifier } = req.body as { identifier: string };
  if (!identifier) {
    res.status(400).json({ error: "البريد أو رقم الجوال مطلوب" });
    return;
  }

  const customer = await findCustomerByIdentifier(identifier);
  if (!customer) {
    res.json({ exists: false });
    return;
  }

  res.json({
    exists: true,
    customer: {
      id: customer.id,
      email: customer.email,
      fullName: customer.full_name,
      phone: customer.phone,
    },
  });
});

// Send register code to email
router.post("/customer/register/send-email-code", async (req, res) => {
  try {
    const { email, phone } = req.body as { email: string; phone: string };
    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedPhone = normalizeSaudiPhone(phone);

    if (!normalizedEmail || !normalizedPhone) {
      res.status(400).json({ error: "البريد ورقم الجوال مطلوبان" });
      return;
    }

    const emailFree = await ensureEmailNotUsed(normalizedEmail);
    if (!emailFree) {
      res.status(409).json({ error: "البريد مستخدم بالفعل" });
      return;
    }

    const phoneFree = await ensurePhoneNotUsed(normalizedPhone);
    if (!phoneFree) {
      res.status(409).json({ error: "رقم الجوال مستخدم بالفعل" });
      return;
    }

    if (!isEmailConfigured()) {
      res.status(503).json({ error: "إرسال البريد غير مهيأ بعد" });
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const sent = await sendCustomerLoginCodeEmail(normalizedEmail, code);
    if (!sent) {
      res.status(502).json({ error: "تعذر إرسال كود البريد" });
      return;
    }

    const state = upsertRegisterState(normalizedEmail, normalizedPhone);
    state.emailCode = code;
    state.emailVerified = false;
    state.expiresAt = Date.now() + REG_CODE_TTL_MS;
    registerVerificationStore.set(normalizedEmail, state);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Verify register email code
router.post("/customer/register/verify-email-code", async (req, res) => {
  try {
    const { email, code } = req.body as { email: string; code: string };
    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedCode = code?.trim();

    if (!normalizedEmail || !normalizedCode) {
      res.status(400).json({ error: "البريد والكود مطلوبان" });
      return;
    }

    const state = getRegisterState(normalizedEmail);
    if (!state || !state.emailCode || state.emailCode !== normalizedCode) {
      res.status(401).json({ error: "كود البريد غير صحيح أو منتهي" });
      return;
    }

    state.emailVerified = true;
    state.emailCode = null;
    state.expiresAt = Date.now() + REG_CODE_TTL_MS;
    registerVerificationStore.set(normalizedEmail, state);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Send register code to WhatsApp phone
router.post("/customer/register/send-whatsapp-code", async (req, res) => {
  try {
    const { email, phone } = req.body as { email?: string; phone: string };
    const normalizedEmail = email?.toLowerCase().trim() || "";
    const normalizedPhone = normalizeSaudiPhone(phone);

    if (!normalizedPhone) {
      res.status(400).json({ error: "رقم الجوال مطلوب" });
      return;
    }

    const phoneFree = await ensurePhoneNotUsed(normalizedPhone);
    if (!phoneFree) {
      res.status(409).json({ error: "رقم الجوال مستخدم بالفعل" });
      return;
    }

    if (normalizedEmail) {
      const emailFree = await ensureEmailNotUsed(normalizedEmail);
      if (!emailFree) {
        res.status(409).json({ error: "البريد مستخدم بالفعل" });
        return;
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const sent = await sendOtpViaWhatsApp({
      to: normalizedPhone,
      otp: code,
      purpose: "customer",
      preferredChannel: "web",
    });

    if (!sent.success) {
      res.status(502).json({ error: sent.error || "تعذر إرسال كود واتساب" });
      return;
    }

    const state = normalizedEmail
      ? upsertRegisterState(normalizedEmail, normalizedPhone)
      : upsertRegisterStateByPhone(normalizedPhone);
    state.phoneCode = code;
    state.phoneVerified = false;
    state.expiresAt = Date.now() + REG_CODE_TTL_MS;
    registerVerificationStore.set(phoneStateKey(normalizedPhone), state);
    if (normalizedEmail) {
      state.email = normalizedEmail;
      registerVerificationStore.set(emailStateKey(normalizedEmail), state);
    }

    res.json({ success: true, channel: sent.mode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Verify register WhatsApp code
router.post("/customer/register/verify-whatsapp-code", async (req, res) => {
  try {
    const { email, phone, code } = req.body as { email?: string; phone?: string; code: string };
    const normalizedEmail = email?.toLowerCase().trim() || "";
    const normalizedPhone = normalizeSaudiPhone(phone || "");
    const normalizedCode = code?.trim();

    if ((!normalizedEmail && !normalizedPhone) || !normalizedCode) {
      res.status(400).json({ error: "البريد أو الجوال والكود مطلوبان" });
      return;
    }

    const state = normalizedEmail
      ? getRegisterState(normalizedEmail)
      : getRegisterStateByPhone(normalizedPhone);
    if (!state || !state.phoneCode || state.phoneCode !== normalizedCode) {
      res.status(401).json({ error: "كود واتساب غير صحيح أو منتهي" });
      return;
    }

    state.phoneVerified = true;
    state.phoneCode = null;
    state.expiresAt = Date.now() + REG_CODE_TTL_MS;
    registerVerificationStore.set(phoneStateKey(state.phone), state);
    if (state.email) {
      registerVerificationStore.set(emailStateKey(state.email), state);
    }

    const verificationToken = createRegisterVerificationToken(state.phone);
    res.json({ success: true, verificationToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Register (requires phone verification only)
router.post("/customer/register", async (req, res) => {
  try {
    const { email, password, fullName, phone, verificationToken } = req.body as { email: string; password: string; fullName: string; phone?: string; verificationToken?: string };
    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedPhone = normalizeSaudiPhone(phone || "");

    if (!normalizedEmail || !password || !fullName || !normalizedPhone) {
      res.status(400).json({ error: "جميع الحقول مطلوبة" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }

    const uniqueness = await ensureNoExistingCustomer(normalizedEmail, normalizedPhone);
    if (!uniqueness.ok) {
      res.status(409).json({ error: uniqueness.error });
      return;
    }

    const hasValidVerificationToken = verificationToken
      ? consumeRegisterVerificationToken(verificationToken, normalizedPhone)
      : false;

    const state = getRegisterStateByPhone(normalizedPhone) || getRegisterState(normalizedEmail);
    const hasVerifiedPhoneState = Boolean(state && state.phone === normalizedPhone && state.phoneVerified);

    if (!hasValidVerificationToken && !hasVerifiedPhoneState) {
      res.status(400).json({ error: "يجب توثيق رقم الجوال قبل إنشاء الحساب" });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const insert = await pool.query(
      `INSERT INTO customers (email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name`,
      [normalizedEmail, hash, fullName.trim(), normalizedPhone],
    );

    registerVerificationStore.delete(emailStateKey(normalizedEmail));
    registerVerificationStore.delete(phoneStateKey(normalizedPhone));

    const customer = insert.rows[0];
    const token = await createSession(customer.id as number);

    res.cookie("customer_token", token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    await runAutomationTrigger(pool, "customer_signup", {
      customerName: fullName.trim(),
      customerEmail: normalizedEmail,
      customerPhone: normalizedPhone,
      status: "حساب جديد",
    });

    res.json({ success: true, customer: { id: customer.id, email: customer.email, fullName: customer.full_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Login (email or phone + password)
router.post("/customer/login", async (req, res) => {
  try {
    const { email, identifier, password } = req.body as { email?: string; identifier?: string; password: string };
    const loginIdentifier = (identifier || email || "").trim();

    if (!loginIdentifier || !password) {
      res.status(400).json({ error: "البريد/الجوال وكلمة المرور مطلوبان" });
      return;
    }

    const customer = await findCustomerByIdentifier(loginIdentifier, { includePassword: true });
    if (!customer || !customer.password_hash) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }

    const match = await bcrypt.compare(password, customer.password_hash as string);
    if (!match) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }

    const token = await createSession(customer.id as number);
    res.cookie("customer_token", token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, customer: { id: customer.id, email: customer.email, fullName: customer.full_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Send login code by email (identifier can be email or phone)
router.post("/customer/send-login-code", async (req, res) => {
  try {
    const { email, identifier } = req.body as { email?: string; identifier?: string };
    const inputIdentifier = (identifier || email || "").trim();

    if (!inputIdentifier) {
      res.status(400).json({ error: "البريد أو الجوال مطلوب" });
      return;
    }

    if (!isEmailConfigured()) {
      res.status(503).json({ error: "إرسال البريد غير مهيأ بعد" });
      return;
    }

    const customer = await findCustomerByIdentifier(inputIdentifier);
    if (!customer) {
      res.status(404).json({ error: "لا يوجد حساب بهذه البيانات" });
      return;
    }

    const normalizedEmail = customer.email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const sent = await sendCustomerLoginCodeEmail(normalizedEmail, code);
    if (!sent) {
      res.status(502).json({ error: "تعذر إرسال الكود" });
      return;
    }

    await pool.query(
      `INSERT INTO customer_login_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
      [normalizedEmail, code, expiresAt],
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Send login code by WhatsApp (identifier can be email or phone)
router.post("/customer/send-login-whatsapp-code", async (req, res) => {
  try {
    const { email, identifier } = req.body as { email?: string; identifier?: string };
    const inputIdentifier = (identifier || email || "").trim();

    if (!inputIdentifier) {
      res.status(400).json({ error: "البريد أو الجوال مطلوب" });
      return;
    }

    const customer = await findCustomerByIdentifier(inputIdentifier);
    if (!customer) {
      res.status(404).json({ error: "لا يوجد حساب بهذه البيانات" });
      return;
    }

    const phone = normalizeSaudiPhone(String(customer.phone || ""));
    if (!phone) {
      res.status(400).json({ error: "رقم واتساب غير متوفر لهذا الحساب" });
      return;
    }

    const normalizedEmail = customer.email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const sent = await sendOtpViaWhatsApp({
      to: phone,
      otp: code,
      purpose: "customer",
      preferredChannel: "web",
    });

    if (!sent.success) {
      res.status(502).json({ error: sent.error || "تعذر إرسال الكود عبر واتساب" });
      return;
    }

    await pool.query(
      `INSERT INTO customer_login_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
      [normalizedEmail, code, expiresAt],
    );

    res.json({ success: true, channel: sent.mode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Verify login code from WhatsApp (identifier can be email or phone)
router.post("/customer/verify-login-whatsapp-code", async (req, res) => {
  try {
    const { email, identifier, code } = req.body as { email?: string; identifier?: string; code: string };
    const inputIdentifier = (identifier || email || "").trim();
    const normalizedCode = code?.trim();

    if (!inputIdentifier || !normalizedCode) {
      res.status(400).json({ error: "البريد/الجوال والكود مطلوبان" });
      return;
    }

    const customer = await findCustomerByIdentifier(inputIdentifier);
    if (!customer) {
      res.status(404).json({ error: "الحساب غير موجود" });
      return;
    }

    const normalizedEmail = customer.email.toLowerCase().trim();

    const codeResult = await pool.query(
      `SELECT id FROM customer_login_codes
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail, normalizedCode],
    );

    if (codeResult.rows.length === 0) {
      res.status(401).json({ error: "الكود غير صحيح أو منتهي" });
      return;
    }

    await pool.query(`UPDATE customer_login_codes SET used = TRUE WHERE id = $1`, [codeResult.rows[0].id]);

    const token = await createSession(customer.id as number);
    res.cookie("customer_token", token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, customer: { id: customer.id, email: customer.email, fullName: customer.full_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Verify login code from email (identifier can be email or phone)
router.post("/customer/verify-login-code", async (req, res) => {
  try {
    const { email, identifier, code } = req.body as { email?: string; identifier?: string; code: string };
    const inputIdentifier = (identifier || email || "").trim();
    const normalizedCode = code?.trim();

    if (!inputIdentifier || !normalizedCode) {
      res.status(400).json({ error: "البريد/الجوال والكود مطلوبان" });
      return;
    }

    const customer = await findCustomerByIdentifier(inputIdentifier);
    if (!customer) {
      res.status(404).json({ error: "الحساب غير موجود" });
      return;
    }

    const normalizedEmail = customer.email.toLowerCase().trim();

    const codeResult = await pool.query(
      `SELECT id FROM customer_login_codes
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail, normalizedCode],
    );

    if (codeResult.rows.length === 0) {
      res.status(401).json({ error: "الكود غير صحيح أو منتهي" });
      return;
    }

    await pool.query(`UPDATE customer_login_codes SET used = TRUE WHERE id = $1`, [codeResult.rows[0].id]);

    const token = await createSession(customer.id as number);
    res.cookie("customer_token", token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, customer: { id: customer.id, email: customer.email, fullName: customer.full_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ" });
  }
});

// Me
router.get("/customer/me", async (req, res) => {
  const token = req.cookies?.customer_token as string | undefined;
  if (!token) {
    res.json({ authenticated: false });
    return;
  }

  const result = await pool.query(
    `SELECT c.id, c.email, c.full_name FROM customer_sessions cs
     JOIN customers c ON c.id = cs.customer_id
     WHERE cs.token = $1 AND cs.expires_at > NOW()`,
    [token],
  );

  if (result.rows.length === 0) {
    res.json({ authenticated: false });
    return;
  }

  const c = result.rows[0];
  res.json({ authenticated: true, customer: { id: c.id, email: c.email, fullName: c.full_name } });
});

// Logout
router.post("/customer/logout", async (req, res) => {
  const token = req.cookies?.customer_token as string | undefined;
  if (token) await pool.query(`DELETE FROM customer_sessions WHERE token = $1`, [token]);
  res.clearCookie("customer_token");
  res.json({ success: true });
});

async function createSession(customerId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await pool.query(`INSERT INTO customer_sessions (customer_id, token, expires_at) VALUES ($1, $2, $3)`, [customerId, token, expiresAt]);
  return token;
}

export default router;
