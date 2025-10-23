@echo off
REM Script to check Brenda's roles in production
REM Usage: check-brenda.bat <admin-email> <admin-password>

if "%1"=="" (
    echo ERROR: Please provide admin email
    echo Usage: check-brenda.bat admin@email.com password
    exit /b 1
)

if "%2"=="" (
    echo ERROR: Please provide admin password
    echo Usage: check-brenda.bat admin@email.com password
    exit /b 1
)

set ADMIN_EMAIL=%1
set ADMIN_PASSWORD=%2

echo Checking Brenda's roles in production...
node get-brenda-roles.js
