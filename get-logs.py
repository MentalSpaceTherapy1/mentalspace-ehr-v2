import subprocess
import json

# Get logs
result = subprocess.run([
    'aws', 'logs', 'get-log-events',
    '--log-group-name', '/ecs/mentalspace-ehr-dev',
    '--log-stream-name', 'backend/mentalspace-backend/49f6615581e94c049cbfb2af65a0550f',
    '--limit', '100',
    '--start-from-head'
], capture_output=True, text=True, env={'MSYS_NO_PATHCONV': '1'})

if result.returncode != 0:
    print("Error:", result.stderr)
    exit(1)

data = json.loads(result.stdout)
for event in data['events']:
    print(event['message'])
