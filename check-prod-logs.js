const { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogStreamsCommand } = require('@aws-sdk/client-cloudwatch-logs');

const client = new CloudWatchLogsClient({ region: 'us-east-1' });

async function checkLogs() {
  try {
    // First get the most recent log streams
    const streamsCmd = new DescribeLogStreamsCommand({
      logGroupName: '/ecs/mentalspace-backend-prod',
      orderBy: 'LastEventTime',
      descending: true,
      limit: 3
    });
    const streamsResponse = await client.send(streamsCmd);

    console.log('Recent log streams:');
    streamsResponse.logStreams.forEach(s => {
      console.log(`  - ${s.logStreamName} (last event: ${new Date(s.lastEventTimestamp).toISOString()})`);
    });

    // Get logs from the most recent stream
    const latestStream = streamsResponse.logStreams[0].logStreamName;
    console.log(`\nChecking logs from: ${latestStream}\n`);

    const command = new FilterLogEventsCommand({
      logGroupName: '/ecs/mentalspace-backend-prod',
      logStreamNames: [latestStream],
      startTime: Date.now() - 300000, // 5 minutes ago
      limit: 100
    });

    const response = await client.send(command);

    if (response.events && response.events.length > 0) {
      console.log(`Found ${response.events.length} log events\n`);
      response.events.forEach(event => {
        // Filter for startup-related messages
        const msg = event.message;
        if (msg.includes('Intake') || msg.includes('forms') || msg.includes('seed') ||
            msg.includes('Database') || msg.includes('Started') || msg.includes('Starting') ||
            msg.includes('Schema')) {
          console.log(msg);
        }
      });
    } else {
      console.log('No events found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLogs();
