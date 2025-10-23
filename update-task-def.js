const fs = require('fs');

const IMAGE_URI = '706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend@sha256:2eb1416302794b9e427ed1f313b4be5c5fd0a80a8e11c0bbd2d4d408186f4a44';
const GIT_SHA = 'b2590657727e6c40666ab4a5d55e0f94f4ff935d';
const BUILD_TIME = new Date().toISOString();

// Read current task definition
const taskDef = JSON.parse(fs.readFileSync('task-def-phase1.5.json', 'utf8'));

// Update image
taskDef.containerDefinitions[0].image = IMAGE_URI;

// Add environment variables
taskDef.containerDefinitions[0].environment.push(
  { name: 'GIT_SHA', value: GIT_SHA },
  { name: 'BUILD_TIME', value: BUILD_TIME }
);

// Add healthcheck
taskDef.containerDefinitions[0].healthCheck = {
  command: ['CMD-SHELL', 'curl -f http://localhost:3001/api/v1/health/live || exit 1'],
  interval: 30,
  timeout: 5,
  retries: 3,
  startPeriod: 60
};

// Remove fields that shouldn't be in new task def registration
delete taskDef.taskDefinitionArn;
delete taskDef.revision;
delete taskDef.status;
delete taskDef.requiresAttributes;
delete taskDef.compatibilities;
delete taskDef.registeredAt;
delete taskDef.registeredBy;

// Write updated task definition
fs.writeFileSync('task-def-updated.json', JSON.stringify(taskDef, null, 2));

console.log('Task definition updated successfully');
console.log('Image URI:', IMAGE_URI);
console.log('Git SHA:', GIT_SHA);
console.log('Build Time:', BUILD_TIME);
