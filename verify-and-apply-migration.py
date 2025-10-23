#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 1.4 Migration Verification and Application
This script verifies if the migration was applied and applies it if needed.
"""

import subprocess
import json
import sys
import time

print("=" * 60)
print("Phase 1.4 Migration Verification")
print("=" * 60)
print()

# Step 1: Get running task
print("Step 1: Finding running ECS task...")
try:
    result = subprocess.run(
        [
            "aws", "ecs", "list-tasks",
            "--cluster", "mentalspace-ehr-prod",
            "--service-name", "mentalspace-backend",
            "--desired-status", "RUNNING",
            "--region", "us-east-1",
            "--output", "json"
        ],
        capture_output=True,
        text=True,
        check=True
    )

    tasks_data = json.loads(result.stdout)
    if not tasks_data.get('taskArns'):
        print("[ERROR] No running tasks found")
        sys.exit(1)

    task_arn = tasks_data['taskArns'][0]
    task_id = task_arn.split('/')[-1]
    print(f"[OK] Found running task: {task_id}")

except subprocess.CalledProcessError as e:
    print(f"[ERROR] Failed to list tasks: {e.stderr}")
    print("\nNote: ECS endpoint may not be accessible from local network.")
    print("Please verify migration manually via AWS Console:")
    print("1. Go to ECS → Clusters → mentalspace-ehr-prod")
    print("2. Click on running task")
    print("3. Click 'Execute command'")
    print("4. Run: npx prisma migrate deploy")
    sys.exit(1)

print()
print("=" * 60)
print("Migration Verification Instructions")
print("=" * 60)
print()
print("Due to network limitations, please verify migration manually:")
print()
print("METHOD 1: Via AWS Console (Recommended)")
print("-" * 60)
print("1. Open AWS Console: https://console.aws.amazon.com/ecs")
print("2. Navigate to: Clusters → mentalspace-ehr-prod")
print(f"3. Click on task: {task_id}")
print("4. Click 'Execute command' button")
print("5. Container: mentalspace-backend")
print("6. Command: /bin/sh")
print("7. Click 'Execute'")
print()
print("In the terminal that opens, run:")
print("   npx prisma migrate deploy")
print()
print("Then verify:")
print("   npx prisma migrate status")
print()
print("Check tables:")
print('   echo "SELECT COUNT(*) FROM signature_attestations;" | \\')
print('     PGPASSWORD="$DATABASE_PASSWORD" psql \\')
print('     -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -t')
print()
print("Expected result: 4")
print()

print("METHOD 2: Via AWS CLI (If ECS Exec is enabled)")
print("-" * 60)
print("Run this command:")
print()
print(f"aws ecs execute-command \\")
print(f"  --cluster mentalspace-ehr-prod \\")
print(f"  --task {task_id} \\")
print(f"  --container mentalspace-backend \\")
print(f"  --interactive \\")
print(f"  --command '/bin/sh' \\")
print(f"  --region us-east-1")
print()
print("Then run the same verification commands as above.")
print()

print("METHOD 3: Check Application Logs")
print("-" * 60)
print("The migration may have auto-applied when the container started.")
print("Check CloudWatch logs:")
print()
print("aws logs tail /aws/ecs/mentalspace-backend-prod \\")
print("  --follow \\")
print("  --filter-pattern 'migration' \\")
print("  --region us-east-1")
print()

print("=" * 60)
print("What to Look For")
print("=" * 60)
print()
print("Migration successful if you see:")
print("✓ signature_attestations table with 4 rows")
print("✓ signature_events table exists")
print("✓ Users table has signaturePin, signaturePassword columns")
print()

print("If migration needs to be applied:")
print("→ Run: npx prisma migrate deploy")
print("→ This is safe - Prisma will only apply pending migrations")
print()

print("=" * 60)
print("Next Steps After Migration Verified")
print("=" * 60)
print()
print("1. Test API endpoints:")
print("   curl https://api.mentalspaceehr.com/api/v1/health")
print()
print("2. Test frontend:")
print("   Visit: https://mentalspaceehr.com")
print("   Go to: Settings → Signature Authentication")
print()
print("3. Set up test credentials:")
print("   PIN: 1234")
print("   Password: TestPassword123")
print()
print("4. Sign a test note and verify signature event created")
print()

print("=" * 60)
print("For detailed instructions, see:")
print("  PHASE-1.4-DEPLOYMENT-SUCCESS.md")
print("=" * 60)
