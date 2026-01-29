const fs = require('fs');
const path = require('path');

const BACKEND_DIR = './backend';
const FRONTEND_DIRS = ['./src', './App.js'];

const stats = {
  backend: { removed: 0, replaced: 0, kept: 0 },
  frontend: { removed: 0, kept: 0 }
};

function cleanBackendFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  const lines = content.split('\n');
  const cleanedLines = [];
  let removedCount = 0;
  let replacedCount = 0;
  
  let hasLoggerImport = content.includes("require('./services/logger')") || 
                        content.includes("require('../services/logger')") ||
                        content.includes("require('../../services/logger')");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('console.log') || trimmed.startsWith('console.error') || 
        trimmed.startsWith('console.warn') || trimmed.startsWith('console.debug')) {
      
      if (shouldRemoveBackendLog(trimmed)) {
        removedCount++;
        continue;
      }
      
      cleanedLines.push(line);
    } else {
      cleanedLines.push(line);
    }
  }
  
  content = cleanedLines.join('\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    stats.backend.removed += removedCount;
    stats.backend.replaced += replacedCount;
    if (removedCount > 0 || replacedCount > 0) {
      console.log(`  ${path.basename(filePath)}: removed ${removedCount}, replaced ${replacedCount}`);
    }
  }
}

function shouldRemoveBackendLog(line) {
  const removePatterns = [
    /console\.log\(['"`]here['"`]/i,
    /console\.log\(['"`]test['"`]/i,
    /console\.log\(['"`]debug['"`]/i,
    /console\.log\(['"`]checking['"`]/i,
    /console\.log\(['"`]TODO['"`]/i,
    /console\.log\(['"`]FIXME['"`]/i,
    /console\.log\(['"`]\[DEBUG\]/i,
    /console\.log\(['"`]====/,
    /console\.log\(['"`]----/,
    /console\.log\(['"`]\*\*\*\*/,
    /console\.log\(['"`]~~~~~/,
    /console\.log\(\s*\)/,
    /console\.log\(['"`]['"`]\)/,
    /console\.log\(['"`]\s*['"`]\)/,
    /console\.log\([a-zA-Z_][a-zA-Z0-9_]*\)\s*;?\s*$/,
    /console\.log\(['"`]\[.*\] (Checking|Starting|Processing|Loading|Fetching|Getting|Creating|Updating|Deleting)/i,
    /console\.log\(['"`](Checking|Starting|Processing|Loading|Fetching|Getting|Creating|Updating|Deleting)/i,
    /console\.log\(['"`]Request (body|params|query|headers)/i,
    /console\.log\(['"`]Response:/i,
    /console\.log\(['"`]Data:/i,
    /console\.log\(['"`]Result:/i,
    /console\.log\(['"`]Found/i,
    /console\.log\(['"`]Using/i,
    /console\.log\(['"`]Got/i,
    /console\.log\(['"`]Received/i,
    /console\.log\(['"`]Sending/i,
    /console\.log\(['"`]Called/i,
    /console\.log\(['"`]Calling/i,
    /console\.log\(['"`]Entered/i,
    /console\.log\(['"`]Exiting/i,
    /console\.log\(['"`]Before/i,
    /console\.log\(['"`]After/i,
  ];
  
  const keepPatterns = [
    /error/i,
    /failed/i,
    /Server running/i,
    /listening on/i,
    /connected/i,
    /initialized/i,
    /✅/,
    /❌/,
    /⚠️/,
    /🔔/,
    /🔐/,
    /stripe/i,
    /payment/i,
    /hipaa/i,
    /audit/i,
    /security/i,
    /authentication/i,
    /database.*check/i,
  ];
  
  for (const pattern of keepPatterns) {
    if (pattern.test(line)) return false;
  }
  
  for (const pattern of removePatterns) {
    if (pattern.test(line)) return true;
  }
  
  return false;
}

function cleanFrontendFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  const lines = content.split('\n');
  const cleanedLines = [];
  let removedCount = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('console.log') || trimmed.startsWith('console.debug')) {
      if (shouldRemoveFrontendLog(trimmed)) {
        removedCount++;
        continue;
      }
    }
    
    cleanedLines.push(line);
  }
  
  content = cleanedLines.join('\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    stats.frontend.removed += removedCount;
    if (removedCount > 0) {
      console.log(`  ${path.basename(filePath)}: removed ${removedCount}`);
    }
  }
}

function shouldRemoveFrontendLog(line) {
  const keepPatterns = [
    /error/i,
    /failed/i,
    /✅/,
    /❌/,
    /API Configuration/,
    /Firebase/i,
  ];
  
  for (const pattern of keepPatterns) {
    if (pattern.test(line)) return false;
  }
  
  const removePatterns = [
    /console\.log\(['"`]\[.*\]/,
    /console\.log\(['"`]here/i,
    /console\.log\(['"`]test/i,
    /console\.log\(['"`]debug/i,
    /console\.log\(['"`]checking/i,
    /console\.log\([a-zA-Z_][a-zA-Z0-9_]*\)\s*;?\s*$/,
    /console\.log\(\s*\)/,
    /console\.log\(['"`]['"`]\)/,
    /console\.debug/,
  ];
  
  for (const pattern of removePatterns) {
    if (pattern.test(line)) return true;
  }
  
  return false;
}

function processDirectory(dir, cleanFn, extensions = ['.js', '.jsx']) {
  if (!fs.existsSync(dir)) return;
  
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (extensions.some(ext => dir.endsWith(ext))) {
      cleanFn(dir);
    }
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = fs.statSync(filePath);
    
    if (fileStat.isDirectory()) {
      if (['node_modules', '.git', '.expo', 'public', 'dist'].includes(file)) continue;
      processDirectory(filePath, cleanFn, extensions);
    } else if (extensions.some(ext => file.endsWith(ext))) {
      cleanFn(filePath);
    }
  }
}

console.log('=== Console.log Cleanup Script ===\n');

console.log('Cleaning backend...');
processDirectory(BACKEND_DIR, cleanBackendFile);

console.log('\nCleaning frontend...');
for (const dir of FRONTEND_DIRS) {
  processDirectory(dir, cleanFrontendFile);
}

console.log('\n=== Summary ===');
console.log(`Backend: ${stats.backend.removed} removed, ${stats.backend.replaced} replaced`);
console.log(`Frontend: ${stats.frontend.removed} removed`);
console.log(`Total cleaned: ${stats.backend.removed + stats.backend.replaced + stats.frontend.removed}`);
