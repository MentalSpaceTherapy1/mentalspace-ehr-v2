const fs = require('fs');
const path = require('path');

// Read the schema file
const schemaPath = path.join(__dirname, 'packages/database/prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Comment out GroupSession model (lines 3865-3909)
content = content.replace(
  /^model GroupSession \{[\s\S]*?\n\}/gm,
  (match) => match.split('\n').map(line => '// ' + line).join('\n')
);

// Comment out GroupMember model (lines 3911-3943)
content = content.replace(
  /^model GroupMember \{[\s\S]*?\n\}/gm,
  (match) => match.split('\n').map(line => '// ' + line).join('\n')
);

// Comment out GroupAttendance model (lines 3945-3963)
content = content.replace(
  /^model GroupAttendance \{[\s\S]*?\n\}/gm,
  (match) => match.split('\n').map(line => '// ' + line).join('\n')
);

// Write back the modified content
fs.writeFileSync(schemaPath, content);

console.log('Successfully commented out GroupSession, GroupMember, and GroupAttendance models.');