/**
 * One-shot migration: lift the base64 card templates out of TS source into
 * static asset files so they stop being bundled into the JS payload.
 *
 * Run: node scripts/extract-templates.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'templates');
mkdirSync(outDir, { recursive: true });

const sources = [
  ['src/constants/cardTemplate.ts', 'th-template'],
  ['src/constants/sgCardTemplate.ts', 'sg-template'],
  ['src/constants/brCardTemplate.ts', 'br-template'],
  ['src/constants/usCardTemplate.ts', 'us-template'],
  ['src/constants/vnCardTemplate.ts', 'vn-template'],
  ['src/constants/defaultPortrait.ts', 'default-portrait'],
];

/** Pull the first quoted string literal out of the module. */
function extractBase64(source) {
  const match = source.match(/=\s*[`'"]([\s\S]*?)[`'"]\s*;/);
  if (!match) throw new Error('no string literal found');
  return match[1].replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
}

function detectExtension(base64) {
  if (base64.startsWith('iVBORw0KGgo')) return 'png';
  if (base64.startsWith('/9j/')) return 'jpg';
  if (base64.startsWith('UklGR')) return 'webp';
  throw new Error(`unrecognised image signature: ${base64.slice(0, 12)}`);
}

for (const [relPath, name] of sources) {
  const base64 = extractBase64(readFileSync(join(root, relPath), 'utf8'));
  const ext = detectExtension(base64);
  const buffer = Buffer.from(base64, 'base64');
  writeFileSync(join(outDir, `${name}.${ext}`), buffer);
  console.log(`${relPath} -> public/templates/${name}.${ext} (${Math.round(buffer.length / 1024)} KB)`);
}
