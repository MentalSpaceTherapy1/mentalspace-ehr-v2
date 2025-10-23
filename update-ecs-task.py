#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import json
import sys

# Configuration
IMAGE_DIGEST = "sha256:8f4645dd4b9b71b91498dcd6c93eb11d84daa74850064c29165fea1f418ec577"
IMAGE_URI = f"706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend@{IMAGE_DIGEST}"
TASK_FAMILY = "mentalspace-backend-prod"
CLUSTER = "mentalspace-ehr-prod"
SERVICE = "mentalspace-backend"

print("=" * 60)
print("ECS Task Definition Update - Phase 1.4")
print("=" * 60)
print(f"Image URI: {IMAGE_URI}")
print("")

# Step 1: Get current task definition
print("Step 1: Fetching current task definition...")
try:
    result = subprocess.run(
        [
            "aws", "ecs", "describe-task-definition",
            "--task-definition", TASK_FAMILY,
            "--region", "us-east-1"
        ],
        capture_output=True,
        text=True,
        check=True
    )
    task_def_response = json.loads(result.stdout)
    task_def = task_def_response["taskDefinition"]
    print(f"[OK] Current revision: {task_def['revision']}")
except subprocess.CalledProcessError as e:
    print(f"[ERROR] Error fetching task definition: {e.stderr}")
    sys.exit(1)

# Step 2: Update image URI
print("\nStep 2: Updating image URI...")
task_def["containerDefinitions"][0]["image"] = IMAGE_URI
print(f"[OK] Image updated to: {IMAGE_URI}")

# Step 3: Remove read-only fields
print("\nStep 3: Cleaning task definition...")
fields_to_remove = [
    "taskDefinitionArn",
    "revision",
    "status",
    "requiresAttributes",
    "compatibilities",
    "registeredAt",
    "registeredBy"
]

for field in fields_to_remove:
    task_def.pop(field, None)

print(f"[OK] Removed {len(fields_to_remove)} read-only fields")

# Step 4: Register new task definition
print("\nStep 4: Registering new task definition...")
try:
    result = subprocess.run(
        ["aws", "ecs", "register-task-definition",
         "--cli-input-json", json.dumps(task_def),
         "--region", "us-east-1"],
        capture_output=True,
        text=True,
        check=True
    )
    new_task_response = json.loads(result.stdout)
    new_revision = new_task_response["taskDefinition"]["revision"]
    print(f"[OK] New revision created: {new_revision}")
except subprocess.CalledProcessError as e:
    print(f"[ERROR] Error registering task definition: {e.stderr}")
    sys.exit(1)

# Step 5: Update ECS service
print(f"\nStep 5: Updating ECS service to revision {new_revision}...")
try:
    result = subprocess.run(
        [
            "aws", "ecs", "update-service",
            "--cluster", CLUSTER,
            "--service", SERVICE,
            "--task-definition", f"{TASK_FAMILY}:{new_revision}",
            "--force-new-deployment",
            "--region", "us-east-1"
        ],
        capture_output=True,
        text=True,
        check=True
    )
    service_response = json.loads(result.stdout)
    print(f"[OK] Service updated successfully")
    print(f"  Desired count: {service_response['service']['desiredCount']}")
    print(f"  Running count: {service_response['service']['runningCount']}")
except subprocess.CalledProcessError as e:
    print(f"[ERROR] Error updating service: {e.stderr}")
    sys.exit(1)

# Step 6: Wait for deployment
print("\nStep 6: Waiting for deployment to stabilize...")
print("This may take 3-5 minutes...")
try:
    subprocess.run(
        [
            "aws", "ecs", "wait", "services-stable",
            "--cluster", CLUSTER,
            "--services", SERVICE,
            "--region", "us-east-1"
        ],
        check=True
    )
    print("[OK] Deployment completed successfully!")
except subprocess.CalledProcessError as e:
    print(f"[WARN] Deployment may still be in progress. Check AWS Console.")

print("\n" + "=" * 60)
print("ECS Deployment Complete!")
print("=" * 60)
print(f"Task Definition: {TASK_FAMILY}:{new_revision}")
print(f"Image: {IMAGE_URI}")
print(f"Cluster: {CLUSTER}")
print(f"Service: {SERVICE}")
print("\nNext steps:")
print("1. Apply database migration")
print("2. Verify deployment")
print("=" * 60)
