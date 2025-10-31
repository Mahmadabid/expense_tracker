const fs = require('fs');
const path = require('path');

// SVG template for icons
const createSVG = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad1)"/>
  
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

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const iconsDir = path.join(__dirname, 'public', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG files for each size
sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}x${size}.png.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Created ${filename}`);
});

// Create a simple PNG fallback using data URL (for development)
// In production, you should use proper PNG files
sizes.forEach(size => {
  const svg = createSVG(size);
  const base64 = Buffer.from(svg).toString('base64');
  const dataUrl = `data:image/svg+xml;base64,${base64}`;
  
  // Save as text file with data URL for reference
  fs.writeFileSync(
    path.join(iconsDir, `icon-${size}x${size}.dataurl.txt`), 
    dataUrl
  );
});

console.log('Icon generation complete!');
console.log('Note: For production, convert these SVGs to PNG using a tool like ImageMagick or an online converter.');
