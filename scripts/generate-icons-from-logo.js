const fs = require('fs');
const path = require('path');

// Read the original logo SVG
const logoPath = path.join(__dirname, '..', 'public', 'logo.svg');
const logoSVG = fs.readFileSync(logoPath, 'utf8');

// Function to create icon SVG from logo at different sizes
const createIconSVG = (size) => {
  // Extract the SVG content without the XML declaration
  const svgContent = logoSVG.replace(/<\?xml.*?\?>/g, '').trim();
  
  // Modify viewBox to ensure proper scaling
  const modifiedSVG = svgContent
    .replace(/viewBox="0 0 200 200"/, `viewBox="0 0 200 200"`)
    .replace(/width="200" height="200"/, `width="${size}" height="${size}"`);
  
  return modifiedSVG;
};

// Function to create a square icon with padding for maskable icons
const createMaskableIconSVG = (size) => {
  const padding = size * 0.1; // 10% padding for safe zone
  const innerSize = size - (padding * 2);
  const scale = innerSize / 200;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bgGrad-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="mainGrad-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Safe zone background -->
  <rect width="${size}" height="${size}" fill="url(#bgGrad-${size})"/>
  
  <!-- Logo content scaled and centered -->
  <g transform="translate(${padding}, ${padding}) scale(${scale})">
    <!-- Main Circle -->
    <circle cx="100" cy="100" r="75" fill="url(#mainGrad-${size})" stroke="#1e40af" stroke-width="2"/>

    <!-- Bar chart bars -->
    <g opacity="0.95">
      <rect x="55" y="110" width="18" height="35" rx="3" fill="#ffffff"/>
      <rect x="80" y="85" width="18" height="60" rx="3" fill="#ffffff"/>
      <rect x="105" y="65" width="18" height="80" rx="3" fill="#ffffff"/>
      <rect x="130" y="75" width="18" height="70" rx="3" fill="#ffffff"/>
    </g>

    <!-- Trend line -->
    <path d="M 60 120 L 89 95 L 114 75 L 139 85"
          stroke="#f59e0b" stroke-width="4" fill="none"
          stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>

    <!-- Data points -->
    <circle cx="60" cy="120" r="4" fill="#f59e0b"/>
    <circle cx="89" cy="95" r="4" fill="#f59e0b"/>
    <circle cx="114" cy="75" r="4" fill="#f59e0b"/>
    <circle cx="139" cy="85" r="4" fill="#f59e0b"/>

    <!-- Progress arc -->
    <path d="M 100 40 A 55 55 0 0 1 145 60"
          stroke="#ffffff" stroke-width="6" fill="none"
          stroke-linecap="round" opacity="0.4"/>
  </g>
</svg>`;
};

// Icon sizes needed for PWA (simplified to 2 main sizes)
const sizes = [144, 512];

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 Generating PWA icons from logo.svg...\n');

// Generate regular icons
sizes.forEach(size => {
  const svg = createIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`✓ Created ${filename}`);
});

// Generate maskable icons (with padding for safe zone)
console.log('\n🎭 Generating maskable icons...\n');
sizes.forEach(size => {
  const svg = createMaskableIconSVG(size);
  const filename = `icon-${size}x${size}-maskable.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`✓ Created ${filename}`);
});

// Create Apple Touch Icon (192x192 - standard size)
const appleTouchIcon = createMaskableIconSVG(192);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleTouchIcon);
console.log('\n✓ Created apple-touch-icon.svg (192x192)');

console.log('\n✅ Icon generation complete!');
console.log('\n📝 Generated files:');
console.log('  - Regular icons: icon-144x144.svg, icon-512x512.svg');
console.log('  - Maskable icons: icon-144x144-maskable.svg, icon-512x512-maskable.svg');
console.log('  - Apple touch icon: 192x192');
console.log('\n💡 SVG icons work great for PWAs!');
console.log('   For PNG conversion (if needed): https://cloudconvert.com/svg-to-png');
