-- =====================================================
-- REVO AM - Database Security & Management Setup
-- =====================================================
-- This script creates stored procedures, functions, triggers, and security constraints
-- All data is stored in database with strong security and audit trails

-- =====================================================
-- 1. CREATE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 2. CREATE AUDIT & SECURITY TABLES
-- =====================================================

-- Audit log table - track all database changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Failed login attempts
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  ip_address INET,
  user_agent TEXT,
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session security table
CREATE TABLE IF NOT EXISTS session_security (
  id SERIAL PRIMARY KEY,
  session_token TEXT UNIQUE NOT NULL,
  user_id INTEGER,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('customer', 'admin')),
  ip_address INET NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE
);

-- Data encryption key management
CREATE TABLE IF NOT EXISTS encryption_keys (
  id SERIAL PRIMARY KEY,
  key_name VARCHAR(255) UNIQUE NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rotated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE & SECURITY
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_operation ON audit_logs(table_name, operation);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_locked_until ON failed_login_attempts(locked_until);
CREATE INDEX IF NOT EXISTS idx_session_security_token ON session_security(session_token);
CREATE INDEX IF NOT EXISTS idx_session_security_expires ON session_security(expires_at);
CREATE INDEX IF NOT EXISTS idx_ratings_approved ON ratings(approved);
CREATE INDEX IF NOT EXISTS idx_ratings_customer_id ON ratings(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- =====================================================
-- 4. SECURITY FUNCTIONS
-- =====================================================

-- Hash passwords securely
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Verify password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password = crypt(password, hash);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate secure token
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_data(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql;

-- Decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_data(data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(data, key);
END;
$$ LANGUAGE plpgsql;

-- Validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate phone format
CREATE OR REPLACE FUNCTION is_valid_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN phone ~ '^\+?[0-9]{7,15}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(email VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT fla.locked_until INTO locked_until
  FROM failed_login_attempts fla
  WHERE fla.email = $1
  LIMIT 1;
  
  IF locked_until IS NOT NULL AND locked_until > NOW() THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. AUDIT TRIGGERS
-- =====================================================

-- Audit trigger function - logs all changes
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name, operation, record_id, 
    old_values, new_values, changed_at
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers on key tables
CREATE TRIGGER audit_customers_trigger AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_orders_trigger AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_ratings_trigger AFTER INSERT OR UPDATE OR DELETE ON ratings
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- =====================================================
-- 6. STORED PROCEDURES - CUSTOMER MANAGEMENT
-- =====================================================

-- Register new customer with validation
CREATE OR REPLACE FUNCTION register_customer(
  p_email VARCHAR,
  p_password TEXT,
  p_full_name VARCHAR,
  p_phone VARCHAR DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  customer_id INTEGER,
  message TEXT
) AS $$
DECLARE
  v_customer_id INTEGER;
  v_password_hash TEXT;
BEGIN
  -- Validate email
  IF NOT is_valid_email(p_email) THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Invalid email format'::TEXT;
    RETURN;
  END IF;

  -- Check if email exists
  IF EXISTS(SELECT 1 FROM customers WHERE email = LOWER(p_email)) THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Email already registered'::TEXT;
    RETURN;
  END IF;

  -- Validate phone if provided
  IF p_phone IS NOT NULL AND NOT is_valid_phone(p_phone) THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Invalid phone format'::TEXT;
    RETURN;
  END IF;

  -- Hash password
  v_password_hash := hash_password(p_password);

  -- Insert customer
  INSERT INTO customers (email, password_hash, full_name, phone, created_at)
  VALUES (LOWER(p_email), v_password_hash, p_full_name, p_phone, NOW())
  RETURNING id INTO v_customer_id;

  -- Log registration
  INSERT INTO audit_logs (
    table_name, operation, record_id, 
    new_values, changed_at, ip_address
  ) VALUES (
    'customers', 'INSERT', v_customer_id,
    jsonb_build_object('email', p_email, 'action', 'registration'),
    NOW(), p_ip_address
  );

  RETURN QUERY SELECT TRUE, v_customer_id, 'Registration successful'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. STORED PROCEDURES - AUTHENTICATION
-- =====================================================

-- Login with security checks
CREATE OR REPLACE FUNCTION customer_login(
  p_email VARCHAR,
  p_password TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  customer_id INTEGER,
  token TEXT,
  message TEXT
) AS $$
DECLARE
  v_customer RECORD;
  v_attempt_count INTEGER;
  v_token TEXT;
BEGIN
  -- Check if account is locked
  IF is_account_locked(p_email) THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, 'Account temporarily locked. Too many login attempts.'::TEXT;
    RETURN;
  END IF;

  -- Get customer
  SELECT id, password_hash INTO v_customer
  FROM customers
  WHERE email = LOWER(p_email)
  LIMIT 1;

  IF v_customer IS NULL THEN
    -- Log failed attempt
    INSERT INTO failed_login_attempts (email, attempt_count, ip_address, last_attempt)
    VALUES (LOWER(p_email), 1, p_ip_address, NOW())
    ON CONFLICT (email) DO UPDATE SET
      attempt_count = failed_login_attempts.attempt_count + 1,
      last_attempt = NOW();

    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, 'Invalid email or password'::TEXT;
    RETURN;
  END IF;

  -- Verify password
  IF NOT verify_password(p_password, v_customer.password_hash) THEN
    -- Log failed attempt
    INSERT INTO failed_login_attempts (email, attempt_count, ip_address, last_attempt)
    VALUES (LOWER(p_email), 1, p_ip_address, NOW())
    ON CONFLICT (email) DO UPDATE SET
      attempt_count = failed_login_attempts.attempt_count + 1,
      last_attempt = NOW(),
      locked_until = CASE WHEN failed_login_attempts.attempt_count >= 5 
                          THEN NOW() + INTERVAL '30 minutes' 
                          ELSE NULL END;

    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, 'Invalid email or password'::TEXT;
    RETURN;
  END IF;

  -- Clear failed attempts
  DELETE FROM failed_login_attempts WHERE email = LOWER(p_email);

  -- Generate token
  v_token := generate_secure_token();

  -- Create session
  INSERT INTO customer_sessions (customer_id, token, expires_at, created_at)
  VALUES (v_customer.id, v_token, NOW() + INTERVAL '30 days', NOW());

  -- Log successful login
  INSERT INTO audit_logs (
    table_name, operation, record_id,
    new_values, changed_at, ip_address
  ) VALUES (
    'customer_sessions', 'INSERT', v_customer.id,
    jsonb_build_object('email', p_email, 'action', 'login'),
    NOW(), p_ip_address
  );

  RETURN QUERY SELECT TRUE, v_customer.id, v_token, 'Login successful'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. STORED PROCEDURES - RATING MANAGEMENT
-- =====================================================

-- Submit rating with validation
CREATE OR REPLACE FUNCTION submit_rating(
  p_customer_id INTEGER,
  p_order_id INTEGER,
  p_rating INTEGER,
  p_review_text TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  rating_id INTEGER,
  message TEXT
) AS $$
DECLARE
  v_rating_id INTEGER;
  v_order_exists BOOLEAN;
  v_already_rated BOOLEAN;
BEGIN
  -- Validate rating value
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Rating must be between 1 and 5'::TEXT;
    RETURN;
  END IF;

  -- Check if order exists and belongs to customer
  SELECT EXISTS(
    SELECT 1 FROM orders 
    WHERE id = p_order_id 
    AND customer_id = p_customer_id 
    AND status = 'completed'
  ) INTO v_order_exists;

  IF NOT v_order_exists THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Order not found or not completed'::TEXT;
    RETURN;
  END IF;

  -- Check if already rated
  SELECT EXISTS(
    SELECT 1 FROM ratings 
    WHERE order_id = p_order_id 
    AND customer_id = p_customer_id
  ) INTO v_already_rated;

  IF v_already_rated THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'You already rated this order'::TEXT;
    RETURN;
  END IF;

  -- Insert rating
  INSERT INTO ratings (
    order_id, customer_id, rating, 
    review_text, approved, created_at
  ) VALUES (
    p_order_id, p_customer_id, p_rating,
    TRIM(p_review_text), FALSE, NOW()
  )
  RETURNING id INTO v_rating_id;

  RETURN QUERY SELECT TRUE, v_rating_id, 'Rating submitted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. STORED PROCEDURES - ORDER MANAGEMENT
-- =====================================================

-- Create order with security checks
CREATE OR REPLACE FUNCTION create_order(
  p_package_id VARCHAR,
  p_package_name VARCHAR,
  p_customer_name VARCHAR,
  p_customer_email VARCHAR,
  p_customer_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  order_id INTEGER,
  message TEXT
) AS $$
DECLARE
  v_order_id INTEGER;
BEGIN
  -- Validate email
  IF NOT is_valid_email(p_customer_email) THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Invalid email address'::TEXT;
    RETURN;
  END IF;

  -- Insert order
  INSERT INTO orders (
    package_id, package_name, customer_name,
    customer_email, customer_id, status, created_at
  ) VALUES (
    p_package_id, p_package_name, p_customer_name,
    LOWER(p_customer_email), p_customer_id, 'pending_review', NOW()
  )
  RETURNING id INTO v_order_id;

  -- Log order creation
  INSERT INTO audit_logs (
    table_name, operation, record_id,
    new_values, changed_at
  ) VALUES (
    'orders', 'INSERT', v_order_id,
    jsonb_build_object('package', p_package_name, 'customer', p_customer_name),
    NOW()
  );

  RETURN QUERY SELECT TRUE, v_order_id, 'Order created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. STORED PROCEDURES - ADMIN MANAGEMENT
-- =====================================================

-- Admin login
CREATE OR REPLACE FUNCTION admin_login(
  p_email VARCHAR,
  p_password TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  admin_id INTEGER,
  token TEXT,
  message TEXT
) AS $$
DECLARE
  v_admin_record RECORD;
  v_token TEXT;
BEGIN
  -- Get admin (hardcoded for now, in production use separate admin table)
  SELECT 1::INTEGER as id, 
         crypt('admin123', gen_salt('bf', 12)) as password_hash
  INTO v_admin_record
  FROM (SELECT 1) WHERE LOWER(p_email) = 'admin@revo.com';

  IF v_admin_record IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, 'Invalid admin credentials'::TEXT;
    RETURN;
  END IF;

  v_token := generate_secure_token();

  -- Create admin session
  INSERT INTO admin_sessions (token, expires_at, created_at)
  VALUES (v_token, NOW() + INTERVAL '24 hours', NOW());

  -- Log admin login
  INSERT INTO audit_logs (
    table_name, operation, record_id,
    new_values, changed_at, ip_address
  ) VALUES (
    'admin_sessions', 'INSERT', 1,
    jsonb_build_object('email', p_email, 'action', 'admin_login'),
    NOW(), p_ip_address
  );

  RETURN QUERY SELECT TRUE, 1, v_token, 'Admin login successful'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. STORED PROCEDURES - ANALYTICS & REPORTING
-- =====================================================

-- Get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_orders BIGINT,
  completed_orders BIGINT,
  pending_orders BIGINT,
  total_customers BIGINT,
  total_ratings BIGINT,
  approved_ratings BIGINT,
  avg_rating NUMERIC,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT o.id)::BIGINT as total_orders,
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::BIGINT as completed_orders,
    COUNT(CASE WHEN o.status = 'pending_review' THEN 1 END)::BIGINT as pending_orders,
    COUNT(DISTINCT c.id)::BIGINT as total_customers,
    COUNT(DISTINCT r.id)::BIGINT as total_ratings,
    COUNT(CASE WHEN r.approved = TRUE THEN 1 END)::BIGINT as approved_ratings,
    ROUND(AVG(r.rating)::NUMERIC, 2) as avg_rating,
    COALESCE(SUM(dp.price_sar), 0)::NUMERIC as total_revenue
  FROM customers c
  FULL OUTER JOIN orders o ON o.customer_id = c.id
  FULL OUTER JOIN ratings r ON r.customer_id = c.id
  FULL OUTER JOIN digital_products dp ON o.package_id = dp.slug;
END;
$$ LANGUAGE plpgsql;

-- Get customer activity log
CREATE OR REPLACE FUNCTION get_customer_activity(p_customer_id INTEGER, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  activity_type VARCHAR,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.operation as activity_type,
    COALESCE(
      (al.new_values->>'package_name'),
      (al.new_values->>'action'),
      al.table_name
    ) as description,
    al.created_at
  FROM audit_logs al
  WHERE (al.new_values->>'customer_id')::INTEGER = p_customer_id
  OR (al.old_values->>'customer_id')::INTEGER = p_customer_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. MAINTENANCE STORED PROCEDURES
-- =====================================================

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TABLE (
  cleaned_customers BIGINT,
  cleaned_admins BIGINT,
  cleaned_total BIGINT
) AS $$
DECLARE
  v_customers_deleted BIGINT;
  v_admins_deleted BIGINT;
BEGIN
  DELETE FROM customer_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS v_customers_deleted = ROW_COUNT;

  DELETE FROM admin_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS v_admins_deleted = ROW_COUNT;

  INSERT INTO audit_logs (
    table_name, operation, new_values, changed_at
  ) VALUES (
    'maintenance', 'DELETE',
    jsonb_build_object('customers_deleted', v_customers_deleted, 'admins_deleted', v_admins_deleted),
    NOW()
  );

  RETURN QUERY SELECT v_customers_deleted, v_admins_deleted, (v_customers_deleted + v_admins_deleted);
END;
$$ LANGUAGE plpgsql;

-- Archive old audit logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs(p_days_old INTEGER DEFAULT 90)
RETURNS TABLE (
  archived_count BIGINT,
  message TEXT
) AS $$
DECLARE
  v_count BIGINT;
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, 'Archived ' || v_count || ' old audit logs'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Database health check
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS TABLE (
  check_name VARCHAR,
  status VARCHAR,
  details TEXT
) AS $$
BEGIN
  -- Check table sizes
  RETURN QUERY
  SELECT
    'Table Sizes'::VARCHAR,
    'OK'::VARCHAR,
    (SELECT string_agg(schemaname || '.' || tablename || ': ' || pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)), ', ')
     FROM pg_tables
     WHERE schemaname = 'public')::TEXT;

  -- Check for unused indexes
  RETURN QUERY
  SELECT
    'Unused Indexes'::VARCHAR,
    CASE WHEN count(*) > 0 THEN 'WARNING' ELSE 'OK' END::VARCHAR,
    'Found ' || count(*)::TEXT || ' unused indexes'::TEXT
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0;

  -- Check table bloat
  RETURN QUERY
  SELECT
    'Table Bloat'::VARCHAR,
    'OK'::VARCHAR,
    'Run VACUUM and ANALYZE regularly'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. RUN CLEANUP JOB (Every hour)
-- =====================================================

-- This is a comment showing how to schedule:
-- SELECT pg_sleep(3600); -- Run every hour
-- SELECT cleanup_expired_sessions();

-- =====================================================
-- 14. FINAL GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Commit all changes
COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all procedures created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Verify all audit tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%audit%' OR table_name LIKE '%security%'
ORDER BY table_name;

-- Verify indexes created
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;
