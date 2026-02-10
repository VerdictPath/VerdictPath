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

  const videoBackgroundCode = `
    <video id="bg-video" autoplay loop muted playsinline
      style="position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:-1;display:none;">
      <source src="/videos/ship.mp4" type="video/mp4">
    </video>
    <script>
      (function(){
        var vid = document.getElementById('bg-video');
        window.__setVideoBg = function(src) {
          if (vid) {
            vid.querySelector('source').src = src;
            vid.load();
            vid.play().catch(function(){});
          }
        };
        window.__showVideoBg = function(show) {
          if (vid) {
            vid.style.display = show ? 'block' : 'none';
            if (show) vid.play().catch(function(){});
          }
        };
      })();
    </script>`;

  if (!html.includes('id="bg-video"')) {
    html = html.replace('<div id="root"></div>', videoBackgroundCode + '\n    <div id="root"></div>');
    console.log('✓ Injected video background code');
  } else {
    console.log('✓ Video background code already present');
  }

  fs.writeFileSync(indexPath, html);
  console.log(`✓ Updated index.html script reference with cache buster v=${cacheBuster}`);
} else {
  console.log('⚠ Could not find index.html');
}

console.log('✅ Web build paths fixed!');
