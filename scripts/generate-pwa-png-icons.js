/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

async function main() {
  // Lazy import so the script errors clearly if sharp isn't installed.
  // eslint-disable-next-line global-require
  const sharp = require('sharp');

  const projectRoot = path.join(__dirname, '..');
  const iconsDir = path.join(projectRoot, 'public', 'icons');
  const logoPngPath = path.join(projectRoot, 'public', 'logo.png');
  const logoSvgPath = path.join(projectRoot, 'public', 'logo.svg');

  const hasPng = fs.existsSync(logoPngPath);
  const hasSvg = fs.existsSync(logoSvgPath);
  if (!hasPng && !hasSvg) {
    throw new Error(`Missing logo.png/logo.svg in ${path.join(projectRoot, 'public')}`);
  }

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const themeColor = '#2563eb';

  const loadLogo = () => {
    if (hasPng) return sharp(logoPngPath);
    // Fallback to SVG
    return sharp(logoSvgPath);
  };

  const writeAnyIcon = async (size) => {
    await loadLogo()
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
  };

  const writeMaskableIcon = async (size) => {
    const padding = Math.round(size * 0.1);
    const innerSize = size - padding * 2;

    const logoBuffer = await loadLogo()
      .resize(innerSize, innerSize, { fit: 'contain', withoutEnlargement: false })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: themeColor,
      },
    })
      .composite([{ input: logoBuffer, left: padding, top: padding }])
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(path.join(iconsDir, `icon-${size}x${size}-maskable.png`));
  };

  console.log('🎨 Generating PNG PWA icons from', hasPng ? 'logo.png' : 'logo.svg', '...');

  // Minimal set (install + shortcut icons)
  const anySizes = [96, 144, 512];
  for (const size of anySizes) {
    await writeAnyIcon(size);
    console.log(`✓ Wrote public/icons/icon-${size}x${size}.png`);
  }

  // Note: favicon + Apple touch icon files are not generated; layout uses /logo.png and /icons/icon-144x144.png

  console.log('\n✅ Done.');
  console.log('Tip: After changing icons/manifest, unregister the old service worker + clear site data in DevTools → Application.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
