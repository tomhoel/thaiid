/**
 * One-shot codemod: convert the country configs from Metro `require()` asset
 * refs to Vite ESM asset imports, and point them at the extracted templates.
 *
 * Run: node scripts/port-country-configs.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const countries = [
  { file: 'thailand.ts', prefix: 'th', template: '/templates/th-template.png' },
  { file: 'singapore.ts', prefix: 'sg', template: '/templates/sg-template.jpg' },
  { file: 'brazil.ts', prefix: 'br', template: '/templates/br-template.jpg' },
  { file: 'usa.ts', prefix: 'us', template: '/templates/us-template.jpg' },
  { file: 'vietnam.ts', prefix: 'vn', template: '/templates/vn-template.jpg' },
];

for (const { file, prefix, template } of countries) {
  const path = join(root, 'src', 'countries', file);
  let source = readFileSync(path, 'utf8');

  // Collect the asset paths before rewriting, so the imports can be hoisted.
  const assetImports = [];
  const bind = (name, assetPath) => {
    assetImports.push(`import ${name} from '${assetPath}';`);
    return name;
  };

  source = source.replace(
    /emblemAsset:\s*require\('([^']+)'\)/,
    (_m, assetPath) => `emblemAsset: ${bind(`${prefix}Emblem`, assetPath)}`
  );
  source = source.replace(
    /front:\s*require\('([^']+)'\)/,
    (_m, assetPath) => `front: ${bind(`${prefix}CardFront`, assetPath)}`
  );
  source = source.replace(
    /back:\s*require\('([^']+)'\)/,
    (_m, assetPath) => `back: ${bind(`${prefix}CardBack`, assetPath)}`
  );

  // Point the card image block at the extracted generator template.
  source = source.replace(
    /(cardImages:\s*\{[^}]*\},)/,
    `$1\n  cardTemplate: '${template}',`
  );

  // Swap the RN-era imports for the new module layout.
  source = source
    .replace(
      /import \{ type CountryConfig \} from '\.\.\/context\/CountryContext';\n/,
      `import type { CountryConfig } from './types';\n`
    )
    .replace(
      /import \{ DEFAULT_PORTRAIT_URI \} from '\.\.\/constants\/defaultPortrait';\n/,
      `import { DEFAULT_PORTRAIT_URI } from './assets';\n`
    );

  // Hoist asset imports directly beneath the existing import block.
  const lines = source.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, ...assetImports);
  source = lines.join('\n');

  writeFileSync(path, source);
  console.log(`ported ${file} (${assetImports.length} asset imports)`);
}
