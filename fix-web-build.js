const fs = require('fs');
const path = require('path');

// Paths
const buildDir = path.join(__dirname, 'backend/public/app');
const oldJsPath = path.join(buildDir, 'home/runner/workspace/node_modules/expo/AppEntry.js');
const newJsPath = path.join(buildDir, 'bundle.js');
const indexPath = path.join(buildDir, 'index.html');

console.log('Fixing web build paths...');

// Move the JS file to root of build directory
if (fs.existsSync(oldJsPath)) {
  fs.renameSync(oldJsPath, newJsPath);
  console.log('✓ Moved bundle.js to root');
  
  // Remove the old directory structure
  const homeDir = path.join(buildDir, 'home');
  if (fs.existsSync(homeDir)) {
    fs.rmSync(homeDir, { recursive: true, force: true });
    console.log('✓ Cleaned up old directory structure');
  }
} else {
  console.log('⚠ Could not find AppEntry.js at expected path');
}

// Fix the index.html reference with cache-busting timestamp
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  const cacheBuster = Date.now();
  html = html.replace(
    /src="\/home\/runner\/workspace\/node_modules\/expo\/AppEntry\.js"/,
    `src="/bundle.js?v=${cacheBuster}"`
  );
  // Also update any existing bundle.js references to add fresh cache buster
  html = html.replace(
    /src="\/bundle\.js(\?v=\d+)?"/,
    `src="/bundle.js?v=${cacheBuster}"`
  );
  fs.writeFileSync(indexPath, html);
  console.log(`✓ Updated index.html script reference with cache buster v=${cacheBuster}`);
} else {
  console.log('⚠ Could not find index.html');
}

console.log('✅ Web build paths fixed!');
