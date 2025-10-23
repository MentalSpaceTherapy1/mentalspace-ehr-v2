import json
import subprocess

# Get current task definition
result = subprocess.run([
    'aws', 'ecs', 'describe-task-definition',
    '--task-definition', 'mentalspace-backend-prod:8'
], capture_output=True, text=True)

task_def = json.loads(result.stdout)['taskDefinition']

# Add CORS_ORIGINS to environment
container_def = task_def['containerDefinitions'][0]

# Check if CORS_ORIGINS already exists
cors_exists = any(env['name'] == 'CORS_ORIGINS' for env in container_def['environment'])

if not cors_exists:
    container_def['environment'].append({
        'name': 'CORS_ORIGINS',
        'value': 'https://mentalspaceehr.com,https://www.mentalspaceehr.com'
    })

# Remove fields that can't be in register-task-definition
fields_to_remove = [
    'taskDefinitionArn', 'revision', 'status',
    'requiresAttributes', 'compatibilities',
    'registeredAt', 'registeredBy', 'deregisteredAt'
]

for field in fields_to_remove:
    task_def.pop(field, None)

# Write to file
with open('/tmp/new-task-def.json', 'w') as f:
    json.dump(task_def, f, indent=2)

print("Updated task definition saved to /tmp/new-task-def.json")
print("Added CORS_ORIGINS: https://mentalspaceehr.com,https://www.mentalspaceehr.com")
