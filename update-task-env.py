import json

# Read the current task definition
with open('current-task-def.json', 'r') as f:
    task_def = json.load(f)

# Extract the container definition
container = task_def['taskDefinition']['containerDefinitions'][0]
current_env = container['environment']

# New environment variables to add from .env file
# NOTE: Replace the placeholder values below with actual credentials from .env file
new_vars = [
    {"name": "TWILIO_ACCOUNT_SID", "value": "AC***[REPLACE_WITH_ACTUAL_VALUE]***"},
    {"name": "TWILIO_AUTH_TOKEN", "value": "***[REPLACE_WITH_ACTUAL_VALUE]***"},
    {"name": "TWILIO_API_KEY_SID", "value": "SK***[REPLACE_WITH_ACTUAL_VALUE]***"},
    {"name": "TWILIO_API_KEY_SECRET", "value": "***[REPLACE_WITH_ACTUAL_VALUE]***"},
    {"name": "TWILIO_PHONE_NUMBER", "value": "+1***[REPLACE_WITH_ACTUAL_VALUE]***"},
    {"name": "RESEND_API_KEY", "value": "re_***[REPLACE_WITH_ACTUAL_VALUE]***"},
    {"name": "RESEND_FROM_EMAIL", "value": "CHC Therapy <support@chctherapy.com>"}
]

# Get existing variable names
existing_names = {var['name'] for var in current_env}

# Add new variables that don't already exist
for var in new_vars:
    if var['name'] not in existing_names:
        current_env.append(var)
        print(f"Added: {var['name']}")
    else:
        print(f"Already exists: {var['name']}")

# Sort environment variables by name for readability
current_env.sort(key=lambda x: x['name'])

# Create a new task definition for registration
new_task_def = {
    "family": task_def['taskDefinition']['family'],
    "taskRoleArn": task_def['taskDefinition']['taskRoleArn'],
    "executionRoleArn": task_def['taskDefinition']['executionRoleArn'],
    "networkMode": task_def['taskDefinition']['networkMode'],
    "containerDefinitions": [
        {
            "name": container['name'],
            "image": container['image'],
            "cpu": container.get('cpu', 0),
            "memory": container.get('memory'),
            "memoryReservation": container.get('memoryReservation'),
            "portMappings": container['portMappings'],
            "essential": container['essential'],
            "environment": current_env,
            "logConfiguration": container['logConfiguration']
        }
    ],
    "requiresCompatibilities": task_def['taskDefinition']['requiresCompatibilities'],
    "cpu": task_def['taskDefinition']['cpu'],
    "memory": task_def['taskDefinition']['memory']
}

# Write the new task definition
with open('new-task-def.json', 'w') as f:
    json.dump(new_task_def, f, indent=2)

print(f"\nNew task definition created: new-task-def.json")
print(f"Total environment variables: {len(current_env)}")
