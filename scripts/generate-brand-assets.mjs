/**
 * Generates ragmob brand PNG assets from inline SVG.
 * Run: node scripts/generate-brand-assets.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets', 'images');

const CANVAS = '#F7F5F2';
const INK = '#0A0A0A';
const WHITE = '#FFFFFF';
const AMBER = '#F6D88A';

/** Feather-style zap, 24×24 viewBox. */
const ZAP_PATH = 'M13 2L3 14h9l-1 8 10-12h-9l1-8z';

function markGroup({ ink = INK, zap = WHITE, scale = 14, showAccent = false }) {
  const accent = showAccent
    ? `<circle cx="19" cy="5" r="2.2" fill="${AMBER}" />`
    : '';
  return `
    <g transform="translate(512, 512) scale(${scale}) translate(-12, -12)">
      <circle cx="12" cy="12" r="11.5" fill="${ink}" />
      <path d="${ZAP_PATH}" fill="${zap}" />
      ${accent}
    </g>
  `;
}

function svg({ width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${body}
</svg>`;
}

function appIconSvg() {
  return svg({
    width: 1024,
    height: 1024,
    body: `
  <rect width="1024" height="1024" rx="224" fill="${CANVAS}" />
  ${markGroup({ scale: 22, showAccent: true })}
`,
  });
}

function foregroundSvg() {
  return svg({
    width: 1024,
    height: 1024,
    body: markGroup({ scale: 18, showAccent: true }),
  });
}

function backgroundSvg() {
  return svg({
    width: 1024,
    height: 1024,
    body: `<rect width="1024" height="1024" fill="${CANVAS}" />`,
  });
}

function monochromeSvg() {
  return svg({
    width: 1024,
    height: 1024,
    body: markGroup({ ink: INK, zap: INK, scale: 18, showAccent: false }),
  });
}

function splashSvg() {
  return svg({
    width: 512,
    height: 512,
    body: markGroup({ scale: 11, showAccent: true }),
  });
}

function wordmarkSvg() {
  return svg({
    width: 1200,
    height: 320,
    body: `
  <rect width="1200" height="320" fill="none" />
  <g transform="translate(80, 160) scale(10) translate(-12, -12)">
    <circle cx="12" cy="12" r="11.5" fill="${INK}" />
    <path d="${ZAP_PATH}" fill="${WHITE}" />
    <circle cx="19" cy="5" r="2.2" fill="${AMBER}" />
  </g>
  <text
    x="240"
    y="188"
    font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    font-size="128"
    font-weight="700"
    letter-spacing="-4"
    fill="${INK}">ragmob</text>
`,
  });
}

async function render(svgString, filePath, size) {
  const pipeline = sharp(Buffer.from(svgString)).png();
  if (size) {
    await pipeline.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toFile(filePath);
  } else {
    await pipeline.toFile(filePath);
  }
  console.log('wrote', path.relative(process.cwd(), filePath));
}

async function main() {
  await mkdir(OUT, { recursive: true });

  await render(appIconSvg(), path.join(OUT, 'icon.png'));
  await render(foregroundSvg(), path.join(OUT, 'android-icon-foreground.png'));
  await render(backgroundSvg(), path.join(OUT, 'android-icon-background.png'));
  await render(monochromeSvg(), path.join(OUT, 'android-icon-monochrome.png'));
  await render(splashSvg(), path.join(OUT, 'splash-icon.png'), 512);
  await render(appIconSvg(), path.join(OUT, 'favicon.png'), 192);
  await sharp(Buffer.from(wordmarkSvg())).png().toFile(path.join(OUT, 'ragmob-wordmark.png'));
  console.log('wrote', path.relative(process.cwd(), path.join(OUT, 'ragmob-wordmark.png')));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
