const { execSync } = require('child_process');

try {
  const result = execSync(`aws logs get-log-events --log-group-name "/ecs/mentalspace-backend-prod" --log-stream-name "ecs/mentalspace-backend/0a6646b70b6c43aeada4ee0135f95910" --limit 40 --output json`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });

  const data = JSON.parse(result);
  data.events.forEach(event => {
    // Replace non-ASCII chars
    const msg = event.message.replace(/[^\x00-\x7F]/g, '?');
    console.log(msg);
  });
} catch (err) {
  console.error('Error:', err.message);
}
