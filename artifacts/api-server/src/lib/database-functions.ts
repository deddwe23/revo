import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// =====================================================
// AUTHENTICATION LAYER
// =====================================================

/**
 * Register new customer
 * Uses stored procedure: register_customer()
 */
export async function registerCustomer(
  email: string,
  password: string,
  fullName: string,
  phone: string | null = null,
  ipAddress: string = "127.0.0.1"
) {
  try {
    const result = await pool.query(
      `SELECT * FROM register_customer($1, $2, $3, $4, $5::inet)`,
      [email, password, fullName, phone, ipAddress]
    );

    const row = result.rows[0];
    return {
      success: row.success,
      customerId: row.customer_id,
      message: row.message,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      customerId: null,
      message: "Registration failed. Please try again.",
    };
  }
}

/**
 * Customer login with security checks
 * Uses stored procedure: customer_login()
 */
export async function customerLogin(
  email: string,
  password: string,
  ipAddress: string = "127.0.0.1"
) {
  try {
    const result = await pool.query(
      `SELECT * FROM customer_login($1, $2, $3::inet)`,
      [email, password, ipAddress]
    );

    const row = result.rows[0];

    if (row.success) {
      return {
        success: true,
        customerId: row.customer_id,
        token: row.token,
        message: row.message,
      };
    }

    return {
      success: false,
      customerId: null,
      token: null,
      message: row.message,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      customerId: null,
      token: null,
      message: "Login failed. Please try again.",
    };
  }
}

/**
 * Admin login
 * Uses stored procedure: admin_login()
 */
export async function adminLogin(
  email: string,
  password: string,
  ipAddress: string = "127.0.0.1"
) {
  try {
    const result = await pool.query(
      `SELECT * FROM admin_login($1, $2, $3::inet)`,
      [email, password, ipAddress]
    );

    const row = result.rows[0];

    if (row.success) {
      return {
        success: true,
        adminId: row.admin_id,
        token: row.token,
        message: row.message,
      };
    }

    return {
      success: false,
      adminId: null,
      token: null,
      message: row.message,
    };
  } catch (error) {
    console.error("Admin login error:", error);
    return {
      success: false,
      adminId: null,
      token: null,
      message: "Admin login failed.",
    };
  }
}

// =====================================================
// RATING MANAGEMENT
// =====================================================

/**
 * Submit rating with validation
 * Uses stored procedure: submit_rating()
 */
export async function submitRating(
  customerId: number,
  orderId: number,
  rating: number,
  reviewText: string | null = null
) {
  try {
    const result = await pool.query(
      `SELECT * FROM submit_rating($1, $2, $3, $4)`,
      [customerId, orderId, rating, reviewText]
    );

    const row = result.rows[0];

    return {
      success: row.success,
      ratingId: row.rating_id,
      message: row.message,
    };
  } catch (error) {
    console.error("Rating submission error:", error);
    return {
      success: false,
      ratingId: null,
      message: "Failed to submit rating.",
    };
  }
}

// =====================================================
// ORDER MANAGEMENT
// =====================================================

/**
 * Create order with validation
 * Uses stored procedure: create_order()
 */
export async function createOrder(
  packageId: string,
  packageName: string,
  customerName: string,
  customerEmail: string,
  customerId: number | null = null
) {
  try {
    const result = await pool.query(
      `SELECT * FROM create_order($1, $2, $3, $4, $5)`,
      [packageId, packageName, customerName, customerEmail, customerId]
    );

    const row = result.rows[0];

    return {
      success: row.success,
      orderId: row.order_id,
      message: row.message,
    };
  } catch (error) {
    console.error("Order creation error:", error);
    return {
      success: false,
      orderId: null,
      message: "Failed to create order.",
    };
  }
}

// =====================================================
// ANALYTICS & REPORTING
// =====================================================

/**
 * Get dashboard statistics
 * Uses stored procedure: get_dashboard_stats()
 */
export async function getDashboardStats() {
  try {
    const result = await pool.query(`SELECT * FROM get_dashboard_stats()`);

    if (result.rows.length === 0) {
      return {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        totalCustomers: 0,
        totalRatings: 0,
        approvedRatings: 0,
        avgRating: 0,
        totalRevenue: 0,
      };
    }

    const row = result.rows[0];

    return {
      totalOrders: parseInt(row.total_orders),
      completedOrders: parseInt(row.completed_orders),
      pendingOrders: parseInt(row.pending_orders),
      totalCustomers: parseInt(row.total_customers),
      totalRatings: parseInt(row.total_ratings),
      approvedRatings: parseInt(row.approved_ratings),
      avgRating: parseFloat(row.avg_rating) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
    };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return {
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      totalCustomers: 0,
      totalRatings: 0,
      approvedRatings: 0,
      avgRating: 0,
      totalRevenue: 0,
    };
  }
}

/**
 * Get customer activity log
 * Uses stored procedure: get_customer_activity()
 */
export async function getCustomerActivity(
  customerId: number,
  limit: number = 50
) {
  try {
    const result = await pool.query(
      `SELECT * FROM get_customer_activity($1, $2)`,
      [customerId, limit]
    );

    return result.rows.map((row: any) => ({
      activityType: row.activity_type,
      description: row.description,
      createdAt: new Date(row.created_at),
    }));
  } catch (error) {
    console.error("Customer activity error:", error);
    return [];
  }
}

// =====================================================
// AUDIT & SECURITY
// =====================================================

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(
  tableName: string | null = null,
  operation: string | null = null,
  limit: number = 100
) {
  try {
    let query = `
      SELECT id, table_name, operation, record_id, 
             old_values, new_values, changed_at, ip_address
      FROM audit_logs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tableName) {
      query += ` AND table_name = $${params.length + 1}`;
      params.push(tableName);
    }

    if (operation) {
      query += ` AND operation = $${params.length + 1}`;
      params.push(operation);
    }

    query += ` ORDER BY changed_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      tableName: row.table_name,
      operation: row.operation,
      recordId: row.record_id,
      oldValues: row.old_values,
      newValues: row.new_values,
      changedAt: new Date(row.changed_at),
      ipAddress: row.ip_address,
    }));
  } catch (error) {
    console.error("Audit logs error:", error);
    return [];
  }
}

/**
 * Check if account is locked (brute force protection)
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT is_account_locked($1) as locked`,
      [email]
    );
    return result.rows[0].locked;
  } catch (error) {
    console.error("Account lock check error:", error);
    return false;
  }
}

// =====================================================
// MAINTENANCE
// =====================================================

/**
 * Clean up expired sessions
 * Call this periodically (e.g., every hour)
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await pool.query(
      `SELECT * FROM cleanup_expired_sessions()`
    );

    const row = result.rows[0];

    return {
      cleanedCustomers: parseInt(row.cleaned_customers),
      cleanedAdmins: parseInt(row.cleaned_admins),
      cleanedTotal: parseInt(row.cleaned_total),
    };
  } catch (error) {
    console.error("Cleanup error:", error);
    return { cleanedCustomers: 0, cleanedAdmins: 0, cleanedTotal: 0 };
  }
}

/**
 * Archive old audit logs
 */
export async function archiveOldAuditLogs(daysOld: number = 90) {
  try {
    const result = await pool.query(
      `SELECT * FROM archive_old_audit_logs($1)`,
      [daysOld]
    );

    const row = result.rows[0];

    return {
      archivedCount: parseInt(row.archived_count),
      message: row.message,
    };
  } catch (error) {
    console.error("Archive error:", error);
    return { archivedCount: 0, message: "Archive failed" };
  }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth() {
  try {
    const result = await pool.query(`SELECT * FROM database_health_check()`);

    return result.rows.map((row: any) => ({
      checkName: row.check_name,
      status: row.status,
      details: row.details,
    }));
  } catch (error) {
    console.error("Health check error:", error);
    return [];
  }
}

// =====================================================
// CONNECTION MANAGEMENT
// =====================================================

export async function closePool() {
  await pool.end();
}

export { pool };
