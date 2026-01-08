const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');

const client = new CloudWatchLogsClient({ region: 'us-east-1' });

async function getLogs() {
  const now = Date.now();
  const command = new FilterLogEventsCommand({
    logGroupName: '/ecs/mentalspace-backend-prod',
    startTime: now - (10 * 60 * 1000), // Last 10 minutes
    filterPattern: 'telehealth',
    limit: 30,
  });

  const response = await client.send(command);

  for (const event of (response.events || [])) {
    console.log(event.message.substring(0, 500));
    console.log('---');
  }

  if (!response.events || response.events.length === 0) {
    console.log('No telehealth-related logs found');
  }
}

getLogs().catch(console.error);
