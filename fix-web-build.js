const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const buildDir = path.join(__dirname, 'backend/public/app');
const indexPath = path.join(distDir, 'index.html');

console.log('Fixing web build paths...');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  const cacheBuster = Date.now();

  html = html.replace(
    /src="(\/home\/runner\/workspace\/node_modules\/expo\/AppEntry\.js)"/,
    `src="/bundle.js?v=${cacheBuster}"`
  );

  html = html.replace(
    /src="(\/bundle\.js)(\?v=\d+)?"/,
    `src="/bundle.js?v=${cacheBuster}"`
  );

  html = html.replace(
    /src="(\/_expo\/static\/js\/web\/AppEntry[^"]+\.js)"/,
    `src="$1?v=${cacheBuster}"`
  );

  if (html.includes('id="bg-video"')) {
    html = html.replace(/<style>[^]*?<\/style>\s*<video[^]*?<\/video>\s*<script>[^]*?<\/script>\s*/m, '');
    console.log('✓ Removed legacy video injection from index.html');
  }

  fs.writeFileSync(indexPath, html);
  console.log(`✓ Updated index.html with cache buster v=${cacheBuster}`);
} else {
  console.log('⚠ Could not find index.html in dist/');
}

console.log('✅ Web build paths fixed!');
