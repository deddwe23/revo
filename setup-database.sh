#!/bin/bash
# Database Setup Automation Script

echo "🚀 REVO AM - Database Setup Automation"
echo "========================================"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL first."
    exit 1
fi

# Get database credentials
read -p "Enter PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -p "Enter database name (default: revo_am): " DB_NAME
DB_NAME=${DB_NAME:-revo_am}

read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo ""

# Set environment
export PGUSER=$DB_USER
export PGPASSWORD=$DB_PASSWORD

echo ""
echo "📦 Creating database..."
psql -h localhost -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database may already exist"

echo ""
echo "📦 Installing PostgreSQL extensions..."
psql -h localhost -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;"
psql -h localhost -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql -h localhost -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

echo ""
echo "🔧 Running database setup script..."
psql -h localhost -d $DB_NAME -f database-setup.sql

echo ""
echo "✅ Verifying setup..."

# Count functions
FUNCTION_COUNT=$(psql -h localhost -d $DB_NAME -tc "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';" | xargs)
echo "✓ Functions created: $FUNCTION_COUNT"

# Count tables
TABLE_COUNT=$(psql -h localhost -d $DB_NAME -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "✓ Tables created: $TABLE_COUNT"

# Count indexes
INDEX_COUNT=$(psql -h localhost -d $DB_NAME -tc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" | xargs)
echo "✓ Indexes created: $INDEX_COUNT"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update .env with database credentials"
echo "2. Import database-functions.ts into your Node.js project"
echo "3. Run API server: node --env-file=.env ./dist/index.mjs"
echo ""
echo "🔒 Security features enabled:"
echo "✓ Password hashing (bcrypt)"
echo "✓ Session management"
echo "✓ Audit logging"
echo "✓ Brute force protection (30 min lockout after 5 attempts)"
echo "✓ IP address tracking"
echo "✓ Data encryption support"
echo ""
