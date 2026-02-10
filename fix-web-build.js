const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'backend/public/app');
const oldJsPath = path.join(buildDir, 'home/runner/workspace/node_modules/expo/AppEntry.js');
const newJsPath = path.join(buildDir, 'bundle.js');
const indexPath = path.join(buildDir, 'index.html');

console.log('Fixing web build paths...');

if (fs.existsSync(oldJsPath)) {
  fs.renameSync(oldJsPath, newJsPath);
  console.log('✓ Moved bundle.js to root');
  
  const homeDir = path.join(buildDir, 'home');
  if (fs.existsSync(homeDir)) {
    fs.rmSync(homeDir, { recursive: true, force: true });
    console.log('✓ Cleaned up old directory structure');
  }
} else {
  console.log('⚠ Could not find AppEntry.js at expected path');
}

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  const cacheBuster = Date.now();

  html = html.replace(
    /src="\/home\/runner\/workspace\/node_modules\/expo\/AppEntry\.js"/,
    `src="/bundle.js?v=${cacheBuster}"`
  );
  html = html.replace(
    /src="\/bundle\.js(\?v=\d+)?"/,
    `src="/bundle.js?v=${cacheBuster}"`
  );

  if (html.includes('id="bg-video"')) {
    html = html.replace(/<style>[^]*?<\/style>\s*<video[^]*?<\/video>\s*<script>[^]*?<\/script>\s*/m, '');
    console.log('✓ Removed legacy video injection from index.html');
  }

  fs.writeFileSync(indexPath, html);
  console.log(`✓ Updated index.html with cache buster v=${cacheBuster}`);
} else {
  console.log('⚠ Could not find index.html');
}

console.log('✅ Web build paths fixed!');
