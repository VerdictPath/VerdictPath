const fs = require('fs');
const path = require('path');

const srcDir = './src';
const backendDir = './backend';

function removeConsoleLogs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('console.log(') && 
           !trimmed.startsWith('console.warn(') &&
           !trimmed.startsWith('console.error(') &&
           !trimmed.startsWith('console.debug(');
  });
  
  if (lines.length !== filteredLines.length) {
    fs.writeFileSync(filePath, filteredLines.join('\n'));
    console.log(`Cleaned: ${filePath} (removed ${lines.length - filteredLines.length} console statements)`);
  }
}

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  });
}

console.log('Starting console log cleanup...');
walkDir(srcDir, removeConsoleLogs);
walkDir(backendDir, removeConsoleLogs);
console.log('Console log cleanup complete!');
