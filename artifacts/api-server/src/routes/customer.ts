import { Router, type Request, type Response, type NextFunction } from "express";
import pkg from "pg";
import { normalizeSaudiPhone, sendOtpViaWhatsApp } from "../lib/whatsapp-otp.js";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const router = Router();

// In-memory store for phone change OTP verification
const phoneChangeStore = new Map<number, { newPhone: string; code: string; expiresAt: number }>();
const PHONE_OTP_TTL = 10 * 60 * 1000; // 10 minutes

async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.customer_token as string | undefined;
  if (!token) { res.status(401).json({ error: "يجب تسجيل الدخول" }); return; }

  const result = await pool.query(
    `SELECT c.id, c.email, c.full_name FROM customer_sessions cs
     JOIN customers c ON c.id = cs.customer_id
     WHERE cs.token = $1 AND cs.expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) { res.status(401).json({ error: "الجلسة منتهية" }); return; }
  (req as Request & { customer: { id: number; email: string; fullName: string } }).customer = {
    id: result.rows[0].id as number,
    email: result.rows[0].email as string,
    fullName: result.rows[0].full_name as string,
  };
  next();
}

router.get("/customer/orders", requireCustomer, async (req, res) => {
  const customer = (req as Request & { customer: { id: number } }).customer;
  const result = await pool.query(
    `SELECT o.id, o.package_id, o.package_name, o.status, o.created_at,
            CASE WHEN o.receipt_data IS NOT NULL THEN TRUE ELSE FALSE END as has_receipt,
            COALESCE(
              json_agg(
                json_build_object(
                  'package_name', oi.package_name,
                  'quantity', oi.quantity,
                  'unit_price_sar', oi.unit_price_sar,
                  'line_total_sar', oi.line_total_sar
                ) ORDER BY oi.id
              ) FILTER (WHERE oi.id IS NOT NULL),
              '[]'::json
            ) as items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.customer_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [customer.id]
  );
  res.json({ orders: result.rows });
});

router.get("/customer/profile", requireCustomer, async (req, res) => {
  const customer = (req as Request & { customer: { id: number } }).customer;
  const result = await pool.query(
    `SELECT id, email, full_name, phone, created_at FROM customers WHERE id = $1`,
    [customer.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  const c = result.rows[0];
  res.json({
    profile: {
      id: c.id,
      email: c.email,
      fullName: c.full_name,
      phone: c.phone,
      createdAt: c.created_at,
    },
  });
});

router.patch("/customer/profile", requireCustomer, async (req, res) => {
  const customer = (req as Request & { customer: { id: number } }).customer;
  const { fullName, email } = req.body as { fullName?: string; email?: string };

  if (!fullName && email === undefined) {
    res.status(400).json({ error: "لا توجد بيانات للتحديث" });
    return;
  }

  // Validate email uniqueness if changing it
  if (email !== undefined && email.trim() !== "") {
    const existing = await pool.query(
      `SELECT id FROM customers WHERE email = $1 AND id <> $2`,
      [email.trim().toLowerCase(), customer.id]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "البريد الإلكتروني مستخدم لدى حساب آخر" });
      return;
    }
  }

  const result = await pool.query(
    `UPDATE customers
     SET full_name = COALESCE($1, full_name),
         email     = COALESCE($2, email)
     WHERE id = $3
     RETURNING id, email, full_name, phone, created_at`,
    [fullName?.trim() || null, email?.trim().toLowerCase() || null, customer.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  const c = result.rows[0];
  res.json({
    profile: {
      id: c.id,
      email: c.email,
      fullName: c.full_name,
      phone: c.phone,
      createdAt: c.created_at,
    },
  });
});

// Step 1: Request phone change — sends OTP to the new phone via WhatsApp
router.post("/customer/profile/request-phone-change", requireCustomer, async (req, res) => {
  const customer = (req as Request & { customer: { id: number } }).customer;
  const { newPhone } = req.body as { newPhone?: string };

  if (!newPhone?.trim()) {
    res.status(400).json({ error: "رقم الجوال مطلوب" });
    return;
  }

  const normalized = normalizeSaudiPhone(newPhone.trim());
  if (!normalized) {
    res.status(400).json({ error: "رقم الجوال غير صحيح، استخدم 05xxxxxxxx" });
    return;
  }

  // Check not already used by another customer
  const existing = await pool.query(
    `SELECT id FROM customers WHERE (phone = $1 OR phone = $2) AND id <> $3`,
    [normalized, newPhone.trim(), customer.id]
  );
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "رقم الجوال مستخدم لدى حساب آخر" });
    return;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  phoneChangeStore.set(customer.id, { newPhone: normalized, code, expiresAt: Date.now() + PHONE_OTP_TTL });

  try {
    await sendOtpViaWhatsApp({ to: normalized, otp: code, purpose: "customer" });
    res.json({ success: true });
  } catch {
    phoneChangeStore.delete(customer.id);
    res.status(500).json({ error: "تعذر إرسال كود التحقق عبر واتساب" });
  }
});

// Step 2: Confirm phone change — verify OTP then update phone in DB
router.post("/customer/profile/confirm-phone-change", requireCustomer, async (req, res) => {
  const customer = (req as Request & { customer: { id: number } }).customer;
  const { code } = req.body as { code?: string };

  if (!code?.trim()) {
    res.status(400).json({ error: "كود التحقق مطلوب" });
    return;
  }

  const stored = phoneChangeStore.get(customer.id);
  if (!stored || Date.now() > stored.expiresAt) {
    phoneChangeStore.delete(customer.id);
    res.status(400).json({ error: "انتهت صلاحية الكود، أعد إرسال كود جديد" });
    return;
  }

  if (stored.code !== code.trim()) {
    res.status(400).json({ error: "كود التحقق غير صحيح" });
    return;
  }

  phoneChangeStore.delete(customer.id);

  const result = await pool.query(
    `UPDATE customers SET phone = $1 WHERE id = $2 RETURNING id, email, full_name, phone, created_at`,
    [stored.newPhone, customer.id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  const c = result.rows[0];
  res.json({
    profile: {
      id: c.id,
      email: c.email,
      fullName: c.full_name,
      phone: c.phone,
      createdAt: c.created_at,
    },
  });
});

export { requireCustomer };
export default router;
