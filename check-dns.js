const data = require('./dns-records.json');

console.log('DNS Records for mentalspaceehr.com:\n');
console.log('Name'.padEnd(40), 'Type'.padEnd(10), 'Target');
console.log('='.repeat(100));

data.ResourceRecordSets
  .filter(r => r.Type !== 'NS' && r.Type !== 'SOA')
  .forEach(r => {
    const target = r.AliasTarget?.DNSName || (r.ResourceRecords && r.ResourceRecords[0]?.Value) || 'N/A';
    console.log(r.Name.padEnd(40), r.Type.padEnd(10), target);
  });
