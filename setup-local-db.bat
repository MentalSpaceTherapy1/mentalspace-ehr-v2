@echo off
echo ============================================================
echo Setting up Local PostgreSQL Database
echo ============================================================
echo.

REM Add PostgreSQL to PATH for this session
set "PGPATH=C:\Program Files\PostgreSQL\16\bin"
set "PATH=%PGPATH%;%PATH%"

echo Step 1: Setting postgres user password...
"%PGPATH%\psql" -U postgres -c "ALTER USER postgres WITH PASSWORD 'Bing@@0912';" 2>nul
if errorlevel 1 (
    echo Trying alternative method...
    "%PGPATH%\psql" -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'Bing@@0912';"
)

echo.
echo Step 2: Creating database 'mentalspace_ehr'...
"%PGPATH%\createdb" -U postgres -E UTF8 mentalspace_ehr 2>nul
if errorlevel 1 (
    echo Database might already exist, checking...
    "%PGPATH%\psql" -U postgres -lqt | findstr mentalspace_ehr >nul
    if errorlevel 1 (
        echo ERROR: Failed to create database
        pause
        exit /b 1
    ) else (
        echo Database already exists!
    )
) else (
    echo Database created successfully!
)

echo.
echo Step 3: Verifying connection...
"%PGPATH%\psql" -U postgres -d mentalspace_ehr -c "SELECT version();" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot connect to database
    pause
    exit /b 1
) else (
    echo Connection successful!
)

echo.
echo ============================================================
echo PostgreSQL Setup Complete!
echo ============================================================
echo.
echo Database: mentalspace_ehr
echo User: postgres
echo Password: Bing@@0912
echo Host: localhost
echo Port: 5432
echo.
echo Next: Running Prisma migrations...
pause
