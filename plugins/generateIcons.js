/**
 * Post-prebuild script: generates mipmap resources for each country icon.
 * Run after `npx expo prebuild` to copy icons into android/app/src/main/res/
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COUNTRIES = ['th', 'sg', 'br', 'us', 'vn'];
const SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const assetsDir = path.join(__dirname, '..', 'assets');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

for (const country of COUNTRIES) {
  const srcIcon = path.join(assetsDir, `icon-${country}.png`);
  const srcFg = path.join(assetsDir, `icon-${country}-foreground.png`);

  if (!fs.existsSync(srcIcon)) {
    console.log(`Skipping ${country}: icon-${country}.png not found`);
    continue;
  }

  for (const [folder, size] of Object.entries(SIZES)) {
    const outDir = path.join(resDir, folder);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Resize using Python PIL
    const outFile = path.join(outDir, `ic_launcher_${country}.png`);
    const outRound = path.join(outDir, `ic_launcher_${country}_round.png`);

    try {
      execSync(`python -c "
from PIL import Image
img = Image.open('${srcIcon.replace(/\\/g, '/')}').resize((${size}, ${size}), Image.LANCZOS)
img.save('${outFile.replace(/\\/g, '/')}')
# Round version - same for now
img.save('${outRound.replace(/\\/g, '/')}')
"`, { stdio: 'pipe' });
    } catch (e) {
      console.log(`Failed to resize ${country} to ${size}: ${e.message}`);
    }
  }

  console.log(`Generated mipmap resources for ${country}`);
}

console.log('Done generating icon resources.');
