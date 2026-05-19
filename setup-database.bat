@echo off
REM Database Setup Script for Windows

echo.
echo ===========================================
echo   REVO AM - Database Setup Automation
echo ===========================================
echo.

REM Check if psql is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL not found in PATH
    echo Please install PostgreSQL and add it to PATH
    pause
    exit /b 1
)

REM Get user input
set /p DB_USER="Enter PostgreSQL username (default: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_NAME="Enter database name (default: revo_am): "
if "%DB_NAME%"=="" set DB_NAME=revo_am

set /p DB_PASSWORD="Enter PostgreSQL password: "

echo.
echo [1] Creating database...
psql -U %DB_USER% -h localhost -c "CREATE DATABASE %DB_NAME%;" 2>nul || echo Database may already exist

echo [2] Installing PostgreSQL extensions...
psql -U %DB_USER% -h localhost -d %DB_NAME% -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;" -q
psql -U %DB_USER% -h localhost -d %DB_NAME% -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" -q
psql -U %DB_USER% -h localhost -d %DB_NAME% -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" -q

echo [3] Running database setup script...
psql -U %DB_USER% -h localhost -d %DB_NAME% -f database-setup.sql -q

echo.
echo Verifying setup...

REM Count functions
for /f %%I in ('psql -U %DB_USER% -h localhost -d %DB_NAME% -tc "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';" 2^>nul') do set FUNCTION_COUNT=%%I
echo +++ Functions created: %FUNCTION_COUNT%

REM Count tables
for /f %%I in ('psql -U %DB_USER% -h localhost -d %DB_NAME% -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2^>nul') do set TABLE_COUNT=%%I
echo +++ Tables created: %TABLE_COUNT%

REM Count indexes
for /f %%I in ('psql -U %DB_USER% -h localhost -d %DB_NAME% -tc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname=''public'';" 2^>nul') do set INDEX_COUNT=%%I
echo +++ Indexes created: %INDEX_COUNT%

echo.
echo ========== SETUP COMPLETE ==========
echo.
echo Next steps:
echo 1. Update .env with database credentials
echo 2. Copy database-functions.ts to your project
echo 3. Run API server:
echo    node --env-file=.env ./dist/index.mjs
echo.
echo Security features enabled:
echo ✓ Password hashing (bcrypt cost 12)
echo ✓ Session management (encrypted tokens)
echo ✓ Audit logging (complete history)
echo ✓ Brute force protection (30 min lockout)
echo ✓ IP address tracking
echo ✓ Data encryption support
echo.
pause
