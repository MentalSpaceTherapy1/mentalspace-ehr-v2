import json

# Image details
IMAGE_URI = "706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend@sha256:5619a9ff4267bc807f2bae34838bb2575c5df92f321e09aa0653d1415d539361"
GIT_SHA = "0632528012d2d2dc1664f57e22e1003aaabac798"
BUILD_TIME = "2025-10-21T17:39:22Z"

# Read current task definition
with open('current-task-definition.json', 'r') as f:
    task_def = json.load(f)

# Update image URI to use digest
task_def['containerDefinitions'][0]['image'] = IMAGE_URI

# Add GIT_SHA and BUILD_TIME to environment variables
env_vars = task_def['containerDefinitions'][0].get('environment', [])

# Remove existing GIT_SHA and BUILD_TIME if present
env_vars = [e for e in env_vars if e['name'] not in ['GIT_SHA', 'BUILD_TIME']]

# Add new values
env_vars.append({'name': 'GIT_SHA', 'value': GIT_SHA})
env_vars.append({'name': 'BUILD_TIME', 'value': BUILD_TIME})

task_def['containerDefinitions'][0]['environment'] = env_vars

# Add health check if not present
if 'healthCheck' not in task_def['containerDefinitions'][0]:
    task_def['containerDefinitions'][0]['healthCheck'] = {
        'command': ['CMD-SHELL', 'curl -f http://localhost:3001/api/v1/health/live || exit 1'],
        'interval': 30,
        'timeout': 5,
        'retries': 3,
        'startPeriod': 60
    }

# Remove fields that can't be used for registration
fields_to_remove = ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes', 'compatibilities', 'registeredAt', 'registeredBy']
for field in fields_to_remove:
    task_def.pop(field, None)

# Save new task definition
with open('deployment-task-def.json', 'w') as f:
    json.dump(task_def, f, indent=2)

print(f"Task definition updated")
print(f"   Image: {IMAGE_URI}")
print(f"   Git SHA: {GIT_SHA}")
print(f"   Build Time: {BUILD_TIME}")
print(f"   Environment variables: {len(env_vars)}")
print(f"   Saved to: deployment-task-def.json")
