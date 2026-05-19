import { Router, type Request, type Response, type NextFunction } from "express";
import pkg from "pg";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const router = Router();

// Middleware to require admin
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_token as string | undefined;
  if (!token) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  const result = await pool.query(
    `SELECT id FROM admin_sessions WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );
  if (result.rows.length === 0) {
    res.status(401).json({ error: "الجلسة منتهية" });
    return;
  }
  next();
}

// Middleware to require customer login
async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.customer_token as string | undefined;
  if (!token) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  const result = await pool.query(
    `SELECT customer_id FROM customer_sessions WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );
  if (result.rows.length === 0) {
    res.status(401).json({ error: "الجلسة منتهية" });
    return;
  }
  (req as any).customerId = result.rows[0].customer_id;
  next();
}

// Get all approved ratings (public endpoint for homepage carousel)
router.get("/ratings", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, rating, review_text, customer_id, created_at
       FROM ratings
       WHERE approved = true
       ORDER BY created_at DESC
       LIMIT 50`
    );
    res.json({ ratings: result.rows });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.status(500).json({ error: "خطأ في جلب التقييمات" });
  }
});

// Submit a new rating (by customer)
router.post("/ratings", requireCustomer, async (req, res) => {
  const { orderId, rating, reviewText } = req.body as {
    orderId?: number;
    rating?: number;
    reviewText?: string;
  };
  const customerId = (req as any).customerId;

  // Validation
  if (!orderId || !rating) {
    res.status(400).json({ error: "معرف الطلب والتقييم مطلوبان" });
    return;
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و5" });
    return;
  }

  try {
    // Verify order exists and belongs to customer
    const orderResult = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND customer_id = $2 AND status = 'completed'`,
      [orderId, customerId]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: "الطلب غير موجود أو لم يكتمل بعد" });
      return;
    }

    // Check if rating already exists for this order
    const existingRating = await pool.query(
      `SELECT id FROM ratings WHERE order_id = $1 AND customer_id = $2`,
      [orderId, customerId]
    );

    if (existingRating.rows.length > 0) {
      res.status(409).json({ error: "لديك تقييم سابق لهذا الطلب" });
      return;
    }

    // Create rating (not approved by default)
    const result = await pool.query(
      `INSERT INTO ratings (order_id, customer_id, rating, review_text, approved)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, order_id, customer_id, rating, review_text, approved, created_at`,
      [orderId, customerId, rating, reviewText?.trim() || null]
    );

    res.status(201).json({ rating: result.rows[0] });
  } catch (error) {
    console.error("Error creating rating:", error);
    res.status(500).json({ error: "خطأ في إنشاء التقييم" });
  }
});

// Get all ratings for admin (approved and pending)
router.get("/admin/ratings", requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.order_id, r.customer_id, r.rating, r.review_text, r.approved, r.created_at,
              o.package_name, o.customer_name, c.email
       FROM ratings r
       JOIN orders o ON o.id = r.order_id
       JOIN customers c ON c.id = r.customer_id
       ORDER BY r.created_at DESC`
    );
    res.json({ ratings: result.rows });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.status(500).json({ error: "خطأ في جلب التقييمات" });
  }
});

// Approve a rating (admin)
router.patch("/admin/ratings/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body as { approved?: boolean };

  if (approved === undefined) {
    res.status(400).json({ error: "حالة الموافقة مطلوبة" });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE ratings SET approved = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, order_id, customer_id, rating, review_text, approved, created_at`,
      [Boolean(approved), id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "التقييم غير موجود" });
      return;
    }

    res.json({ rating: result.rows[0] });
  } catch (error) {
    console.error("Error updating rating:", error);
    res.status(500).json({ error: "خطأ في تحديث التقييم" });
  }
});

// Delete a rating (admin)
router.delete("/admin/ratings/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM ratings WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "التقييم غير موجود" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting rating:", error);
    res.status(500).json({ error: "خطأ في حذف التقييم" });
  }
});

export default router;
