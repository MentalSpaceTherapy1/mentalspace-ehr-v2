const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'packages', 'frontend', 'src', 'components', 'Layout.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the inline onClick handler with a call to handleMenuItemClick
const oldPattern = /onClick=\{\(\) => \{[\s\S]*?navigate\(item\.path\);[\s\S]*?\}\}\}/;
const replacement = 'onClick={() => handleMenuItemClick(item)}';

content = content.replace(oldPattern, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Layout.tsx onClick handler');
