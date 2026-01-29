const fs = require('fs');
const path = require('path');

const stats = { removed: 0, kept: 0 };

const CRITICAL_KEEP_PATTERNS = [
  /server.*running/i,
  /listening.*port/i,
  /connected.*database/i,
  /initialized/i,
  /✅|❌|⚠️|🔔|🔐|🧹|📋|⏰/,
  /console\.error/,
  /\.error\(/,
  /stripe.*error/i,
  /payment.*error/i,
  /critical/i,
  /fatal/i,
];

function shouldKeep(line) {
  for (const pattern of CRITICAL_KEEP_PATTERNS) {
    if (pattern.test(line)) return true;
  }
  return false;
}

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  const lines = content.split('\n');
  const cleanedLines = [];
  let fileRemoved = 0;
  let fileKept = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.match(/^\s*console\.(log|debug|info|warn)\s*\(/)) {
      if (shouldKeep(line)) {
        cleanedLines.push(line);
        fileKept++;
      } else {
        fileRemoved++;
      }
    } else if (trimmed.match(/console\.(log|debug|info|warn)\s*\(/)) {
      if (shouldKeep(line)) {
        cleanedLines.push(line);
        fileKept++;
      } else {
        const cleaned = line.replace(/console\.(log|debug|info|warn)\s*\([^)]*\)\s*;?/g, '');
        if (cleaned.trim()) {
          cleanedLines.push(cleaned);
        }
        fileRemoved++;
      }
    } else {
      cleanedLines.push(line);
    }
  }
  
  content = cleanedLines.join('\n');
  content = content.replace(/\n{3,}/g, '\n\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    stats.removed += fileRemoved;
    stats.kept += fileKept;
    if (fileRemoved > 0) {
      console.log(`  ${filePath}: removed ${fileRemoved}, kept ${fileKept}`);
    }
  }
}

function processDirectory(dir, extensions = ['.js', '.jsx']) {
  if (!fs.existsSync(dir)) return;
  
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (extensions.some(ext => dir.endsWith(ext))) {
      cleanFile(dir);
    }
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = fs.statSync(filePath);
    
    if (fileStat.isDirectory()) {
      if (['node_modules', '.git', '.expo', 'public', 'dist', 'attached_assets'].includes(file)) continue;
      processDirectory(filePath, extensions);
    } else if (extensions.some(ext => file.endsWith(ext))) {
      cleanFile(filePath);
    }
  }
}

console.log('=== Aggressive Console.log Cleanup ===\n');

const targetDirs = [
  'backend/controllers',
  'backend/routes', 
  'backend/services',
  'backend/middleware',
  'src/screens',
  'src/services',
  'src/contexts',
  'src/components',
  'src/utils',
  'src/config',
  'src/hooks',
  'App.js'
];

for (const dir of targetDirs) {
  console.log(`Processing: ${dir}`);
  processDirectory(dir);
}

console.log(`\n=== Summary ===`);
console.log(`Removed: ${stats.removed}`);
console.log(`Kept: ${stats.kept}`);
