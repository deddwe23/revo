import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import pkg from "pg";
import { sendOrderStatusEmail } from "../lib/email.js";
import { runAutomationTrigger } from "../lib/automation.js";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const ALLOWED_STATUSES = ["pending_review", "in_progress", "completed", "cancelled"];

const router = Router();

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_review: "تحت المراجعة",
  in_progress: "جاري التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_token as string | undefined;
  if (!token) { res.status(401).json({ error: "غير مصرح" }); return; }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const result = await pool.query(`SELECT id FROM admin_sessions WHERE token = $1 AND expires_at > NOW()`, [tokenHash]);
  if (result.rows.length === 0) { res.status(401).json({ error: "الجلسة منتهية" }); return; }
  next();
}

router.get("/admin/orders", requireAdmin, async (_req, res) => {
  const result = await pool.query(`
    SELECT o.id, o.package_id, o.package_name, o.customer_name, o.customer_email,
           o.receipt_filename, o.receipt_mimetype,
           CASE WHEN o.receipt_data IS NOT NULL THEN TRUE ELSE FALSE END as has_receipt,
           o.status, o.created_at, o.notes,
           c.full_name as c_full_name, c.phone as c_phone,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'package_id', oi.package_id,
                 'package_name', oi.package_name,
                 'quantity', oi.quantity,
                 'unit_price_sar', oi.unit_price_sar,
                 'line_total_sar', oi.line_total_sar
               ) ORDER BY oi.id
             ) FILTER (WHERE oi.id IS NOT NULL),
             '[]'::json
           ) as items
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id, c.full_name, c.phone
    ORDER BY o.created_at DESC
  `);
  res.json({ orders: result.rows });
});

router.patch("/admin/orders/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body as { status: string; notes?: string };

  if (!ALLOWED_STATUSES.includes(status)) {
    res.status(400).json({ error: "حالة غير صحيحة" });
    return;
  }

  // Get order info before updating for email
  const orderResult = await pool.query(
    `SELECT o.package_name, o.customer_name, o.customer_email, o.status as current_status,
            c.email as reg_email, c.phone as customer_phone
     FROM orders o LEFT JOIN customers c ON c.id = o.customer_id WHERE o.id = $1`,
    [id]
  );

  if (orderResult.rows.length === 0) { res.status(404).json({ error: "الطلب غير موجود" }); return; }

  const order = orderResult.rows[0];

  await pool.query(
    `UPDATE orders SET status = $1, notes = COALESCE($2, notes) WHERE id = $3`,
    [status, notes || null, id]
  );

  // Send email to customer
  const emailTo = (order.customer_email || order.reg_email) as string | null;
  if (emailTo) {
    await sendOrderStatusEmail(emailTo, {
      orderId: Number(id),
      packageName: order.package_name as string,
      status,
      customerName: order.customer_name as string,
    });
  }

  const previousStatus = String(order.current_status || "");
  if (status === "completed" && previousStatus !== "completed") {
    await runAutomationTrigger(pool, "order_completed", {
      orderId: Number(id),
      packageName: order.package_name as string,
      customerName: order.customer_name as string,
      customerPhone: (order.customer_phone as string | null) ?? null,
      customerEmail: emailTo,
      status: ORDER_STATUS_LABELS[status] || status,
    });
  } else if (status !== previousStatus) {
    await runAutomationTrigger(pool, "order_status_changed", {
      orderId: Number(id),
      packageName: order.package_name as string,
      customerName: order.customer_name as string,
      customerPhone: (order.customer_phone as string | null) ?? null,
      customerEmail: emailTo,
      status,
    });
  }

  res.json({ success: true });
});

router.get("/admin/orders/:id/receipt", requireAdmin, async (req, res) => {
  const result = await pool.query(`SELECT receipt_filename, receipt_mimetype, receipt_data FROM orders WHERE id = $1`, [req.params.id]);
  if (result.rows.length === 0 || !result.rows[0].receipt_data) { res.status(404).json({ error: "لا يوجد إيصال" }); return; }
  const row = result.rows[0];
  const safeFilename = String(row.receipt_filename ?? "receipt")
    .replace(/[\r\n"]/g, "")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_");
  res.setHeader("Content-Type", row.receipt_mimetype as string);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);
  res.end(row.receipt_data as Buffer);
});

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
    FROM orders
  `);
  const customers = await pool.query(`SELECT COUNT(*) as total FROM customers`);
  res.json({ ...result.rows[0], total_customers: customers.rows[0].total });
});

router.get("/admin/customers", requireAdmin, async (_req, res) => {
  const result = await pool.query(`
    SELECT c.id, c.email, c.full_name, c.phone, c.created_at,
           COUNT(o.id) as order_count
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id ORDER BY c.created_at DESC
  `);
  res.json({ customers: result.rows });
});

router.get("/admin/products", requireAdmin, async (_req, res) => {
  const result = await pool.query(
    `SELECT id, slug, title, description, price_sar, delivery_details, is_active, created_at, updated_at
     FROM digital_products
     ORDER BY created_at DESC`,
  );
  res.json({ products: result.rows });
});

router.post("/admin/products", requireAdmin, async (req, res) => {
  const {
    slug,
    title,
    description,
    priceSar,
    deliveryDetails,
    isActive,
  } = req.body as {
    slug?: string;
    title?: string;
    description?: string;
    priceSar?: number;
    deliveryDetails?: string;
    isActive?: boolean;
  };

  if (!slug || !title) {
    res.status(400).json({ error: "الحقول الأساسية مطلوبة" });
    return;
  }

  const parsedPrice = Number(priceSar ?? 0);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    res.status(400).json({ error: "السعر غير صالح" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO digital_products (slug, title, description, price_sar, delivery_details, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, slug, title, description, price_sar, delivery_details, is_active, created_at, updated_at`,
      [
        slug.trim().toLowerCase(),
        title.trim(),
        description?.trim() ?? "",
        parsedPrice,
        deliveryDetails?.trim() ?? null,
        isActive ?? true,
      ],
    );
    res.status(201).json({ product: result.rows[0] });
  } catch {
    res.status(409).json({ error: "slug مستخدم بالفعل" });
  }
});

router.patch("/admin/products/:id", requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);
  if (Number.isNaN(productId)) {
    res.status(400).json({ error: "معرف المنتج غير صالح" });
    return;
  }

  const {
    slug,
    title,
    description,
    priceSar,
    deliveryDetails,
    isActive,
  } = req.body as {
    slug?: string;
    title?: string;
    description?: string;
    priceSar?: number;
    deliveryDetails?: string;
    isActive?: boolean;
  };

  const updates: string[] = [];
  const values: unknown[] = [];

  if (typeof slug === "string") {
    updates.push(`slug = $${values.length + 1}`);
    values.push(slug.trim().toLowerCase());
  }
  if (typeof title === "string") {
    updates.push(`title = $${values.length + 1}`);
    values.push(title.trim());
  }
  if (typeof description === "string") {
    updates.push(`description = $${values.length + 1}`);
    values.push(description.trim());
  }
  if (priceSar !== undefined) {
    const parsedPrice = Number(priceSar);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ error: "السعر غير صالح" });
      return;
    }
    updates.push(`price_sar = $${values.length + 1}`);
    values.push(parsedPrice);
  }
  if (deliveryDetails !== undefined) {
    updates.push(`delivery_details = $${values.length + 1}`);
    values.push(deliveryDetails?.trim() || null);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${values.length + 1}`);
    values.push(Boolean(isActive));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: "لا توجد بيانات للتحديث" });
    return;
  }

  updates.push("updated_at = NOW()");
  values.push(productId);

  const result = await pool.query(
    `UPDATE digital_products
     SET ${updates.join(", ")}
     WHERE id = $${values.length}
     RETURNING id, slug, title, description, price_sar, delivery_details, is_active, created_at, updated_at`,
    values,
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "المنتج غير موجود" });
    return;
  }

  res.json({ product: result.rows[0] });
});

router.get("/admin/settings", requireAdmin, async (_req, res) => {
  const result = await pool.query(
    `SELECT store_name, support_email, whatsapp_number,
            bank_name, beneficiary_name, iban, account_number,
            tiktok_url, instagram_url,
            currency, order_auto_accept, updated_at
     FROM store_settings WHERE id = TRUE`,
  );

  res.json({ settings: result.rows[0] ?? null });
});

router.patch("/admin/settings", requireAdmin, async (req, res) => {
  const {
    storeName,
    supportEmail,
    whatsappNumber,
    bankName,
    beneficiaryName,
    iban,
    accountNumber,
    tiktokUrl,
    instagramUrl,
    currency,
    orderAutoAccept,
  } = req.body as {
    storeName?: string;
    supportEmail?: string;
    whatsappNumber?: string;
    bankName?: string;
    beneficiaryName?: string;
    iban?: string;
    accountNumber?: string;
    tiktokUrl?: string;
    instagramUrl?: string;
    currency?: string;
    orderAutoAccept?: boolean;
  };

  const updates: string[] = [];
  const values: unknown[] = [];

  if (typeof storeName === "string") {
    updates.push(`store_name = $${values.length + 1}`);
    values.push(storeName.trim());
  }
  if (supportEmail !== undefined) {
    updates.push(`support_email = $${values.length + 1}`);
    values.push(supportEmail?.trim() || null);
  }
  if (whatsappNumber !== undefined) {
    updates.push(`whatsapp_number = $${values.length + 1}`);
    values.push(whatsappNumber?.trim() || null);
  }
  if (bankName !== undefined) {
    updates.push(`bank_name = $${values.length + 1}`);
    values.push(bankName?.trim() || null);
  }
  if (beneficiaryName !== undefined) {
    updates.push(`beneficiary_name = $${values.length + 1}`);
    values.push(beneficiaryName?.trim() || null);
  }
  if (iban !== undefined) {
    updates.push(`iban = $${values.length + 1}`);
    values.push(iban?.trim() || null);
  }
  if (accountNumber !== undefined) {
    updates.push(`account_number = $${values.length + 1}`);
    values.push(accountNumber?.trim() || null);
  }
  if (tiktokUrl !== undefined) {
    updates.push(`tiktok_url = $${values.length + 1}`);
    values.push(tiktokUrl?.trim() || null);
  }
  if (instagramUrl !== undefined) {
    updates.push(`instagram_url = $${values.length + 1}`);
    values.push(instagramUrl?.trim() || null);
  }
  if (typeof currency === "string") {
    updates.push(`currency = $${values.length + 1}`);
    values.push(currency.trim().toUpperCase());
  }
  if (orderAutoAccept !== undefined) {
    updates.push(`order_auto_accept = $${values.length + 1}`);
    values.push(Boolean(orderAutoAccept));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: "لا توجد بيانات للتحديث" });
    return;
  }

  updates.push("updated_at = NOW()");

  const result = await pool.query(
    `UPDATE store_settings
     SET ${updates.join(", ")}
     WHERE id = TRUE
     RETURNING store_name, support_email, whatsapp_number,
               bank_name, beneficiary_name, iban, account_number,
               tiktok_url, instagram_url,
               currency, order_auto_accept, updated_at`,
    values,
  );

  res.json({ settings: result.rows[0] });
});

router.get("/admin/content/:key", requireAdmin, async (req, res) => {
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

router.put("/admin/content/:key", requireAdmin, async (req, res) => {
  const rawKey = req.params.key;
  const key = (Array.isArray(rawKey) ? rawKey[0] : rawKey)?.trim().toLowerCase();
  const { value } = req.body as { value?: unknown };

  if (!key) {
    res.status(400).json({ error: "المفتاح مطلوب" });
    return;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    res.status(400).json({ error: "صيغة المحتوى غير صحيحة" });
    return;
  }

  const result = await pool.query(
    `INSERT INTO site_content (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
     RETURNING key, value, updated_at`,
    [key, JSON.stringify(value)],
  );

  res.json({ content: result.rows[0] });
});

router.get("/admin/coupons", requireAdmin, async (_req, res) => {
  const result = await pool.query(
    `SELECT id, code, discount_sar, max_uses, remaining_uses, created_at, updated_at
     FROM coupons
     ORDER BY created_at DESC`,
  );

  res.json({ coupons: result.rows });
});

router.post("/admin/coupons", requireAdmin, async (req, res) => {
  const { code, discountSar, maxUses } = req.body as {
    code?: string;
    discountSar?: number;
    maxUses?: number;
  };

  const normalizedCode = String(code ?? "").trim().toUpperCase();
  const parsedDiscount = Number(discountSar ?? 0);
  const parsedMaxUses = Number(maxUses ?? 0);

  if (!normalizedCode) {
    res.status(400).json({ error: "رمز الكوبون مطلوب" });
    return;
  }

  if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
    res.status(400).json({ error: "قيمة خصم الكوبون غير صالحة" });
    return;
  }

  if (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0) {
    res.status(400).json({ error: "عدد الاستخدامات يجب أن يكون أكبر من صفر" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO coupons (code, discount_sar, max_uses, remaining_uses, updated_at)
       VALUES ($1, $2, $3, $3, NOW())
       RETURNING id, code, discount_sar, max_uses, remaining_uses, created_at, updated_at`,
      [normalizedCode, parsedDiscount, parsedMaxUses],
    );

    res.status(201).json({ coupon: result.rows[0] });
  } catch {
    res.status(409).json({ error: "رمز الكوبون مستخدم بالفعل" });
  }
});

router.delete("/admin/coupons/:id", requireAdmin, async (req, res) => {
  const couponId = Number(req.params.id);
  if (Number.isNaN(couponId)) {
    res.status(400).json({ error: "معرف الكوبون غير صالح" });
    return;
  }

  const result = await pool.query(`DELETE FROM coupons WHERE id = $1 RETURNING id`, [couponId]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: "الكوبون غير موجود" });
    return;
  }

  res.json({ success: true });
});

// Delete single order
router.delete("/admin/orders/:id", requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  if (Number.isNaN(orderId)) {
    res.status(400).json({ error: "معرف الطلب غير صالح" });
    return;
  }

  try {
    await pool.query(`BEGIN`);
    await pool.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
    const result = await pool.query(`DELETE FROM orders WHERE id = $1 RETURNING id`, [orderId]);
    await pool.query(`COMMIT`);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    res.json({ success: true, message: "تم حذف الطلب بنجاح" });
  } catch (error) {
    await pool.query(`ROLLBACK`);
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "خطأ في حذف الطلب" });
  }
});

// Delete all orders
router.delete("/admin/orders", requireAdmin, async (req, res) => {
  const { confirm } = req.body as { confirm?: string };
  if (confirm !== "DELETE_ALL_ORDERS") {
    res.status(400).json({ error: "تأكيد غير صحيح. أرسل confirm: 'DELETE_ALL_ORDERS'" });
    return;
  }

  try {
    await pool.query(`BEGIN`);
    await pool.query(`DELETE FROM order_items`);
    const result = await pool.query(`DELETE FROM orders`);
    await pool.query(`COMMIT`);

    res.json({ success: true, message: `تم حذف ${result.rowCount} طلب بنجاح` });
  } catch (error) {
    await pool.query(`ROLLBACK`);
    console.error("Error deleting all orders:", error);
    res.status(500).json({ error: "خطأ في حذف جميع الطلبات" });
  }
});

// Edit customer info
router.patch("/admin/customers/:id", requireAdmin, async (req, res) => {
  const customerId = Number(req.params.id);
  if (Number.isNaN(customerId)) {
    res.status(400).json({ error: "معرف العميل غير صالح" });
    return;
  }

  const { fullName, email, phone } = req.body as { fullName?: string; email?: string; phone?: string };

  if (!fullName && email === undefined && phone === undefined) {
    res.status(400).json({ error: "لا توجد بيانات للتحديث" });
    return;
  }

  // Validate email uniqueness if changing it
  if (email !== undefined && email.trim() !== "") {
    const existing = await pool.query(
      `SELECT id FROM customers WHERE email = $1 AND id <> $2`,
      [email.trim().toLowerCase(), customerId]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "البريد الإلكتروني مستخدم لدى عميل آخر" });
      return;
    }
  }

  const result = await pool.query(
    `UPDATE customers
     SET full_name = COALESCE($1, full_name),
         email     = COALESCE($2, email),
         phone     = COALESCE($3, phone)
     WHERE id = $4
     RETURNING id, email, full_name, phone, created_at`,
    [
      fullName?.trim() || null,
      email?.trim().toLowerCase() || null,
      phone?.trim() || null,
      customerId,
    ]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "العميل غير موجود" });
    return;
  }

  const c = result.rows[0];
  res.json({
    customer: {
      id: c.id,
      email: c.email,
      fullName: c.full_name,
      phone: c.phone,
      createdAt: c.created_at,
    },
  });
});

// Delete single customer
router.delete("/admin/customers/:id", requireAdmin, async (req, res) => {
  const customerId = Number(req.params.id);
  if (Number.isNaN(customerId)) {
    res.status(400).json({ error: "معرف العميل غير صالح" });
    return;
  }

  try {
    const result = await pool.query(`DELETE FROM customers WHERE id = $1 RETURNING id`, [customerId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }

    res.json({ success: true, message: "تم حذف العميل بنجاح" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ error: "خطأ في حذف العميل" });
  }
});

// Delete all customers
router.delete("/admin/customers", requireAdmin, async (req, res) => {
  const { confirm } = req.body as { confirm?: string };
  if (confirm !== "DELETE_ALL_CUSTOMERS") {
    res.status(400).json({ error: "تأكيد غير صحيح. أرسل confirm: 'DELETE_ALL_CUSTOMERS'" });
    return;
  }

  try {
    const result = await pool.query(`DELETE FROM customers`);
    res.json({ success: true, message: `تم حذف ${result.rowCount} عميل بنجاح` });
  } catch (error) {
    console.error("Error deleting all customers:", error);
    res.status(500).json({ error: "خطأ في حذف جميع العملاء" });
  }
});

// Delete single product
router.delete("/admin/products/:id", requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);
  if (Number.isNaN(productId)) {
    res.status(400).json({ error: "معرف المنتج غير صالح" });
    return;
  }

  try {
    const result = await pool.query(`DELETE FROM products WHERE id = $1 RETURNING id`, [productId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }

    res.json({ success: true, message: "تم حذف المنتج بنجاح" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "خطأ في حذف المنتج" });
  }
});

// Delete all products
router.delete("/admin/products", requireAdmin, async (req, res) => {
  const { confirm } = req.body as { confirm?: string };
  if (confirm !== "DELETE_ALL_PRODUCTS") {
    res.status(400).json({ error: "تأكيد غير صحيح. أرسل confirm: 'DELETE_ALL_PRODUCTS'" });
    return;
  }

  try {
    const result = await pool.query(`DELETE FROM products`);
    res.json({ success: true, message: `تم حذف ${result.rowCount} منتج بنجاح` });
  } catch (error) {
    console.error("Error deleting all products:", error);
    res.status(500).json({ error: "خطأ في حذف جميع المنتجات" });
  }
});

export default router;
