import subprocess
import json
import sys

result = subprocess.run([
    'aws', 'logs', 'get-log-events',
    '--log-group-name', '/ecs/mentalspace-backend-prod',
    '--log-stream-name', 'ecs/mentalspace-backend/0a6646b70b6c43aeada4ee0135f95910',
    '--limit', '30',
    '--output', 'json'
], capture_output=True, text=True, encoding='utf-8', errors='replace')

if result.returncode != 0:
    print(f"Error: {result.stderr}", file=sys.stderr)
else:
    data = json.loads(result.stdout)
    for event in data.get('events', []):
        msg = event.get('message', '').replace('\uffd', '?')
        # Replace problematic unicode chars
        msg = ''.join(c if ord(c) < 128 else '?' for c in msg)
        print(msg)
