@echo off
echo ============================================================
echo AWS CLI Configuration and RDS Security Group Setup
echo ============================================================
echo.
echo This script will:
echo 1. Configure AWS CLI with your credentials
echo 2. Find your RDS security group
echo 3. Add your IP (70.233.179.249) to allow database access
echo.
echo You'll need your AWS Access Key ID and Secret Access Key
echo Get them from: AWS Console -^> IAM -^> Security Credentials
echo.
echo ============================================================
echo.

set /p AWS_ACCESS_KEY_ID="Enter AWS Access Key ID: "
set /p AWS_SECRET_ACCESS_KEY="Enter AWS Secret Access Key: "

echo.
echo Configuring AWS CLI...
aws configure set aws_access_key_id %AWS_ACCESS_KEY_ID%
aws configure set aws_secret_access_key %AWS_SECRET_ACCESS_KEY%
aws configure set default.region us-east-1
aws configure set default.output json

echo.
echo Testing AWS connection...
aws sts get-caller-identity
if errorlevel 1 (
    echo.
    echo ERROR: Failed to authenticate with AWS
    echo Please check your credentials and try again
    pause
    exit /b 1
)

echo.
echo SUCCESS! AWS CLI configured
echo.
echo Finding RDS security group...
for /f "tokens=*" %%i in ('aws rds describe-db-instances --db-instance-identifier mentalspace-ehr-prod --query "DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId" --output text 2^>nul') do set SG_ID=%%i

if "%SG_ID%"=="" (
    echo ERROR: Could not find RDS security group
    pause
    exit /b 1
)

echo Found security group: %SG_ID%
echo.
echo Adding your IP (70.233.179.249/32) to security group...

aws ec2 authorize-security-group-ingress --group-id %SG_ID% --protocol tcp --port 5432 --cidr 70.233.179.249/32 2>nul
if errorlevel 1 (
    echo.
    echo Checking if IP is already authorized...
    aws ec2 describe-security-groups --group-ids %SG_ID% --query "SecurityGroups[0].IpPermissions[?FromPort==`5432`].IpRanges[].CidrIp" --output text | findstr "70.233.179.249" >nul
    if errorlevel 1 (
        echo ERROR: Failed to add IP to security group
        pause
        exit /b 1
    ) else (
        echo Your IP is already authorized!
    )
) else (
    echo SUCCESS! IP added to security group
)

echo.
echo ============================================================
echo COMPLETE! Your laptop can now connect to the database
echo ============================================================
echo.
echo Check your backend terminal - it should reconnect automatically
echo.
pause
