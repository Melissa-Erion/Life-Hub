// Renders app/icons/icon.svg to PNGs. Run: node scripts/make-icons.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '../app/icons/icon.svg'), 'utf8');
  const b = await chromium.launch(); const p = await b.newPage();
  for (const n of [180, 192, 512]) {
    await p.setViewportSize({ width: n, height: n });
    await p.setContent(`<style>*{margin:0}svg{width:${n}px;height:${n}px;display:block}</style>${svg}`);
    await p.screenshot({ path: path.join(__dirname, `../app/icons/icon-${n}.png`) });
  }
  await b.close();
})();
