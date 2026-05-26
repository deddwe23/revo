import { Router } from "express";
import multer from "multer";
import pkg from "pg";
import { sendOrderNotification, type OrderNotificationItem } from "../lib/email.js";
import { logger } from "../lib/logger.js";
import { runAutomationTrigger } from "../lib/automation.js";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

interface RawOrderItem {
  packageId: string;
  quantity: number;
}

router.post("/orders", upload.single("receipt"), async (req, res) => {
  const client = await pool.connect();
  try {
    const { customerName, couponCode, items: itemsRaw, packageId, quantity } = req.body as {
      customerName?: string;
      couponCode?: string;
      items?: string;
      packageId?: string;
      quantity?: string | number;
    };

    // Parse items array
    let parsedItems: RawOrderItem[] = [];
    if (typeof itemsRaw === "string" && itemsRaw.trim()) {
      try {
        parsedItems = JSON.parse(itemsRaw) as RawOrderItem[];
      } catch {
        res.status(400).json({ error: "البيانات المطلوبة ناقصة" });
        return;
      }
    } else if (typeof packageId === "string" && packageId.trim()) {
      parsedItems = [{
        packageId: packageId.trim(),
        quantity: Math.max(1, Math.floor(Number(quantity ?? 1))),
      }];
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      res.status(400).json({ error: "البيانات المطلوبة ناقصة" });
      return;
    }

    // Validate and resolve each item from DB
    interface ResolvedItem { packageId: string; packageName: string; quantity: number; unitPriceSar: number; lineTotalSar: number; }
    const resolvedItems: ResolvedItem[] = [];
    for (const raw of parsedItems) {
      const normalizedId = String(raw.packageId ?? "").trim().toLowerCase();
      if (!normalizedId) { res.status(400).json({ error: "معرف الباقة مطلوب" }); return; }

      const qty = Math.max(1, Math.floor(Number(raw.quantity ?? 1)));
      if (!Number.isFinite(qty)) { res.status(400).json({ error: "الكمية غير صالحة" }); return; }

      const productResult = await client.query(
        `SELECT title, price_sar FROM digital_products WHERE slug = $1 AND is_active = TRUE LIMIT 1`,
        [normalizedId],
      );
      if (productResult.rows.length === 0) {
        res.status(400).json({ error: `الباقة "${normalizedId}" غير متاحة حاليا` });
        return;
      }
      const unitPriceSar = Number(productResult.rows[0].price_sar ?? 0);
      resolvedItems.push({
        packageId: normalizedId,
        packageName: productResult.rows[0].title as string,
        quantity: qty,
        unitPriceSar,
        lineTotalSar: unitPriceSar * qty,
      });
    }

    // Pick representative package_id / package_name for the orders header row
    const orderPackageId = resolvedItems.length === 1 ? resolvedItems[0].packageId : "multiple";
    const orderPackageName = resolvedItems.length === 1
      ? resolvedItems[0].packageName
      : resolvedItems.map(i => i.packageName).join("، ");

    const totalPriceSar = resolvedItems.reduce((sum, i) => sum + i.lineTotalSar, 0);

    // Get customer from session
    let customerId: number | null = null;
    let customerEmail: string | null = null;
    let customerFullName: string | null = null;
    let customerPhone: string | null = null;
    const customerToken = req.cookies?.customer_token as string | undefined;
    if (customerToken) {
      const sessionResult = await client.query(
        `SELECT c.id, c.email, c.full_name, c.phone FROM customer_sessions cs
         JOIN customers c ON c.id = cs.customer_id
         WHERE cs.token = $1 AND cs.expires_at > NOW()`,
        [customerToken]
      );
      if (sessionResult.rows.length > 0) {
        customerId = sessionResult.rows[0].id as number;
        customerEmail = sessionResult.rows[0].email as string;
        customerFullName = sessionResult.rows[0].full_name as string;
        customerPhone = (sessionResult.rows[0].phone as string | null) ?? null;
      }
    }

    const resolvedCustomerName = (customerFullName ?? customerName ?? "").trim();
    if (!resolvedCustomerName) {
      res.status(400).json({ error: "اسم العميل مطلوب" });
      return;
    }

    await client.query("BEGIN");

    let resolvedCouponCode: string | null = null;
    let couponDiscountSar = 0;

    const normalizedCouponCode = String(couponCode ?? "").trim().toUpperCase();
    if (normalizedCouponCode) {
      const couponResult = await client.query(
        `SELECT id, code, discount_sar, remaining_uses FROM coupons WHERE code = $1 FOR UPDATE`,
        [normalizedCouponCode],
      );

      if (couponResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "الكوبون غير صالح" });
        return;
      }

      const couponRow = couponResult.rows[0] as { id: number; code: string; discount_sar: number; remaining_uses: number; };

      if (Number(couponRow.remaining_uses) <= 0) {
        await client.query("DELETE FROM coupons WHERE id = $1", [couponRow.id]);
        await client.query("COMMIT");
        res.status(400).json({ error: "الكوبون منتهي" });
        return;
      }

      resolvedCouponCode = couponRow.code;
      couponDiscountSar = Math.max(0, Number(couponRow.discount_sar));

      const remainingAfterUse = Number(couponRow.remaining_uses) - 1;
      if (remainingAfterUse <= 0) {
        await client.query(`DELETE FROM coupons WHERE id = $1`, [couponRow.id]);
      } else {
        await client.query(`UPDATE coupons SET remaining_uses = $1, updated_at = NOW() WHERE id = $2`, [remainingAfterUse, couponRow.id]);
      }
    }

    const finalPriceSar = Math.max(0, totalPriceSar - couponDiscountSar);

    const file = req.file;
    let result;
    if (file) {
      result = await client.query(
        `INSERT INTO orders (package_id, package_name, quantity, customer_name, customer_id, customer_email,
                             package_price_sar, final_price_sar, coupon_code, coupon_discount_sar,
                             receipt_filename, receipt_mimetype, receipt_data, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending_review') RETURNING id`,
        [orderPackageId, orderPackageName, resolvedItems.reduce((s, i) => s + i.quantity, 0),
         resolvedCustomerName, customerId, customerEmail,
         totalPriceSar, finalPriceSar, resolvedCouponCode, couponDiscountSar || null,
         file.originalname, file.mimetype, file.buffer]
      );
    } else {
      result = await client.query(
        `INSERT INTO orders (package_id, package_name, quantity, customer_name, customer_id, customer_email,
                             package_price_sar, final_price_sar, coupon_code, coupon_discount_sar, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_review') RETURNING id`,
        [orderPackageId, orderPackageName, resolvedItems.reduce((s, i) => s + i.quantity, 0),
         resolvedCustomerName, customerId, customerEmail,
         totalPriceSar, finalPriceSar, resolvedCouponCode, couponDiscountSar || null]
      );
    }

    const orderId = result.rows[0].id as number;

    // Insert order_items rows
    for (const item of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, package_id, package_name, quantity, unit_price_sar, line_total_sar)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.packageId, item.packageName, item.quantity, item.unitPriceSar, item.lineTotalSar]
      );
    }

    await client.query("COMMIT");

    await sendOrderNotification({
      customerName: resolvedCustomerName,
      packageName: orderPackageName,
      packageId: orderPackageId,
      orderId,
      hasReceipt: !!file,
      customerEmail: customerEmail || undefined,
      items: resolvedItems.map((i): OrderNotificationItem => ({
        packageName: i.packageName,
        quantity: i.quantity,
        unitPriceSar: i.unitPriceSar,
        lineTotalSar: i.lineTotalSar,
      })),
      totalPriceSar,
      discountSar: couponDiscountSar,
      finalPriceSar,
      couponCode: resolvedCouponCode || undefined,
    });

    await runAutomationTrigger(pool, "order_created", {
      customerName: resolvedCustomerName,
      customerEmail,
      customerPhone,
      orderId,
      packageName: orderPackageName,
      status: "تحت المراجعة",
    });

    res.json({
      success: true,
      orderId,
      pricing: {
        totalPriceSar,
        discountSar: couponDiscountSar,
        finalPriceSar,
        couponCode: resolvedCouponCode,
      },
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback errors.
    }
    logger.error(err, "Order error");
    res.status(500).json({ error: "حدث خطأ" });
  } finally {
    client.release();
  }
});

export default router;
