const fs = require('fs');
const path = require('path');

// Create simple PNG data URLs for development
// In production, replace these with actual PNG files from a design tool or converter

const createPNGDataURL = (size) => {
  // SVG that will be converted to PNG data URL
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size / 512})">
    <rect x="30" y="60" width="252" height="192" rx="20" fill="#ffffff" opacity="0.95"/>
    <g fill="#667eea">
      <path d="M156 100 L156 80 L176 80 L176 100 M156 230 L156 250 L176 250 L176 230" stroke="#667eea" stroke-width="8" stroke-linecap="round"/>
      <path d="M120 120 Q120 100 145 100 L187 100 Q212 100 212 120 Q212 140 187 140 L145 165 Q120 165 120 185 Q120 205 145 205 L187 205 Q212 205 212 225" 
            stroke="#667eea" stroke-width="12" fill="none" stroke-linecap="round"/>
    </g>
    <rect x="60" y="140" width="80" height="50" rx="5" fill="#764ba2" opacity="0.3"/>
    <rect x="172" y="140" width="80" height="50" rx="5" fill="#764ba2" opacity="0.3"/>
  </g>
</svg>`;
  
  return svg;
};

const sizes = [96, 144, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG files that browsers can use as PNG fallback
sizes.forEach(size => {
  const svg = createPNGDataURL(size);
  const filename = `icon-${size}x${size}.png`;
  const svgFilename = `${filename}.svg`;
  
  // Write as SVG file (browsers can display SVGs as icons)
  fs.writeFileSync(path.join(iconsDir, svgFilename), svg);
  console.log(`✓ Created ${svgFilename}`);
});

console.log('\n✅ Icon generation complete!');
console.log('\n📝 Note: SVG files have been created as PNG fallbacks.');
console.log('For production, convert these to actual PNG files using:');
console.log('  - Online tool: https://cloudconvert.com/svg-to-png');
console.log('  - Or ImageMagick: magick convert icon.svg icon.png');
console.log('  - Or Photoshop/Figma/Sketch\n');
