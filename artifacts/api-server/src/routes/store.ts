import { Router } from "express";
import pkg from "pg";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const router = Router();

router.get("/store/products", async (_req, res) => {
  const result = await pool.query(
    `SELECT id, slug, title, description, price_sar, delivery_details, is_active, created_at, updated_at
     FROM digital_products
     WHERE is_active = TRUE
     ORDER BY created_at ASC`,
  );

  res.json({ products: result.rows });
});

router.get("/store/products/:slug", async (req, res) => {
  const rawSlug = req.params.slug;
  const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug)?.trim().toLowerCase();
  if (!slug) {
    res.status(400).json({ error: "slug مطلوب" });
    return;
  }

  const result = await pool.query(
    `SELECT id, slug, title, description, price_sar, delivery_details, is_active, created_at, updated_at
     FROM digital_products
     WHERE slug = $1 AND is_active = TRUE
     LIMIT 1`,
    [slug],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  res.json({ product: result.rows[0] });
});

router.get("/store/settings", async (_req, res) => {
  const result = await pool.query(
    `SELECT store_name, support_email, whatsapp_number,
            bank_name, beneficiary_name, iban, account_number,
            tiktok_url, instagram_url,
            currency
     FROM store_settings
     WHERE id = TRUE
     LIMIT 1`,
  );

  res.json({ settings: result.rows[0] ?? null });
});

router.get("/store/content/:key", async (req, res) => {
  const rawKey = req.params.key;
  const key = (Array.isArray(rawKey) ? rawKey[0] : rawKey)?.trim().toLowerCase();
  if (!key) {
    res.status(400).json({ error: "المفتاح مطلوب" });
    return;
  }

  const result = await pool.query(
    `SELECT key, value, updated_at FROM site_content WHERE key = $1 LIMIT 1`,
    [key],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "المحتوى غير موجود" });
    return;
  }

  res.json({ content: result.rows[0] });
});

router.post("/store/coupons/validate", async (req, res) => {
  const { code } = req.body as { code?: string };
  const normalizedCode = String(code ?? "").trim().toUpperCase();

  if (!normalizedCode) {
    res.status(400).json({ error: "رمز الكوبون مطلوب" });
    return;
  }

  const result = await pool.query(
    `SELECT id, code, discount_sar, max_uses, remaining_uses
     FROM coupons
     WHERE code = $1
     LIMIT 1`,
    [normalizedCode],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "الكوبون غير صالح" });
    return;
  }

  const coupon = result.rows[0] as {
    id: number;
    code: string;
    discount_sar: number;
    max_uses: number;
    remaining_uses: number;
  };

  if (coupon.remaining_uses <= 0) {
    res.status(404).json({ error: "الكوبون منتهي" });
    return;
  }

  res.json({
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountSar: Number(coupon.discount_sar),
      maxUses: Number(coupon.max_uses),
      remainingUses: Number(coupon.remaining_uses),
    },
  });
});

export default router;
