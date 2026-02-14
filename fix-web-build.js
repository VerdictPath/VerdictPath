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

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const jsWebDir = path.join(dest, '_expo', 'static', 'js', 'web');
  if (fs.existsSync(jsWebDir)) {
    const oldBundles = fs.readdirSync(jsWebDir).filter(f => f.startsWith('AppEntry-') && f.endsWith('.js'));
    oldBundles.forEach(f => {
      fs.unlinkSync(path.join(jsWebDir, f));
      console.log(`✓ Removed old bundle: ${f}`);
    });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying build files to backend/public/app...');
copyDirSync(distDir, buildDir);
console.log('✅ Web build deployed to backend/public/app!');
