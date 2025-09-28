#!/usr/bin/env node

/**
 * TeksiMap Logo PNG Generator
 * 
 * This script converts SVG logos to PNG format for PowerPoint compatibility.
 * 
 * Requirements:
 * npm install sharp
 * 
 * Usage:
 * node generate-png-logos.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    console.log('❌ Sharp not found. Installing...');
    console.log('Please run: npm install sharp');
    console.log('Then run this script again.');
    process.exit(1);
}

// SVG content definitions
const logos = {
    'teksimap-logo-advanced': `<svg width="240" height="60" viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#01386A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0056b3;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge> 
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textShadow">
      <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.2"/>
    </filter>
  </defs>
  <text x="60" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" filter="url(#glow) url(#textShadow)">T</text>
  <text x="78" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" transform="rotate(2 78 32)" filter="url(#textShadow)">e</text>
  <text x="96" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" filter="url(#textShadow)">k</text>
  <text x="114" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" transform="rotate(-1 114 32)" filter="url(#textShadow)">s</text>
  <text x="132" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" filter="url(#textShadow)">i</text>
  <text x="150" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#blueGradient)" filter="url(#textShadow)">M</text>
  <text x="174" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#blueGradient)" filter="url(#textShadow)">a</text>
  <text x="192" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#blueGradient)" filter="url(#textShadow)">p</text>
  <circle cx="210" cy="15" r="2.5" fill="url(#goldGradient)" opacity="0.7"/>
  <circle cx="215" cy="45" r="1.8" fill="#FFA500" opacity="0.6"/>
  <circle cx="220" cy="8" r="2.2" fill="url(#goldGradient)" opacity="0.8"/>
  <circle cx="225" cy="42" r="2" fill="#FFA500" opacity="0.5"/>
</svg>`,

    'teksimap-logo-white': `<svg width="240" height="60" viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F0F0F0;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge> 
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="textShadow">
      <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.2"/>
    </filter>
  </defs>
  <text x="60" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" filter="url(#glow) url(#textShadow)">T</text>
  <text x="78" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" transform="rotate(2 78 32)" filter="url(#textShadow)">e</text>
  <text x="96" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" filter="url(#textShadow)">k</text>
  <text x="114" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" transform="rotate(-1 114 32)" filter="url(#textShadow)">s</text>
  <text x="132" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#goldGradient)" filter="url(#textShadow)">i</text>
  <text x="150" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#whiteGradient)" filter="url(#textShadow)">M</text>
  <text x="174" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#whiteGradient)" filter="url(#textShadow)">a</text>
  <text x="192" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="url(#whiteGradient)" filter="url(#textShadow)">p</text>
  <circle cx="210" cy="15" r="2.5" fill="url(#goldGradient)" opacity="0.7"/>
  <circle cx="215" cy="45" r="1.8" fill="#FFA500" opacity="0.6"/>
  <circle cx="220" cy="8" r="2.2" fill="url(#goldGradient)" opacity="0.8"/>
  <circle cx="225" cy="42" r="2" fill="#FFA500" opacity="0.5"/>
</svg>`,

    'teksimap-icon': `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#01386A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0056b3;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <circle cx="100" cy="100" r="95" fill="url(#blueGradient)" stroke="url(#goldGradient)" stroke-width="4"/>
  <g transform="translate(100, 100)">
    <rect x="-35" y="-45" width="70" height="15" rx="7" fill="url(#goldGradient)" filter="url(#shadow)"/>
    <rect x="-8" y="-45" width="16" height="60" rx="8" fill="url(#goldGradient)" filter="url(#shadow)"/>
  </g>
  <g transform="translate(100, 140)">
    <circle cx="0" cy="-8" r="12" fill="url(#goldGradient)" filter="url(#shadow)"/>
    <path d="M0 4 L-8 20 L8 20 Z" fill="url(#goldGradient)" filter="url(#shadow)"/>
    <path d="M0 -30 L0 -20" stroke="url(#goldGradient)" stroke-width="3" stroke-linecap="round"/>
    <path d="M-15 -25 L-12 -22" stroke="url(#goldGradient)" stroke-width="2" stroke-linecap="round"/>
    <path d="M15 -25 L12 -22" stroke="url(#goldGradient)" stroke-width="2" stroke-linecap="round"/>
  </g>
  <circle cx="50" cy="50" r="4" fill="url(#goldGradient)" opacity="0.6"/>
  <circle cx="150" cy="50" r="4" fill="url(#goldGradient)" opacity="0.6"/>
  <circle cx="50" cy="150" r="4" fill="url(#goldGradient)" opacity="0.6"/>
  <circle cx="150" cy="150" r="4" fill="url(#goldGradient)" opacity="0.6"/>
  <circle cx="70" cy="70" r="2" fill="url(#goldGradient)" opacity="0.4"/>
  <circle cx="130" cy="70" r="2" fill="url(#goldGradient)" opacity="0.4"/>
  <circle cx="70" cy="130" r="2" fill="url(#goldGradient)" opacity="0.4"/>
  <circle cx="130" cy="130" r="2" fill="url(#goldGradient)" opacity="0.4"/>
</svg>`
};

// Size configurations for different use cases
const sizes = {
    'teksimap-logo-advanced': [
        { name: 'small', width: 240, height: 60, suffix: '240x60' },
        { name: 'medium', width: 480, height: 120, suffix: '480x120' },
        { name: 'large', width: 960, height: 240, suffix: '960x240' },
        { name: 'xlarge', width: 1920, height: 480, suffix: '1920x480' }
    ],
    'teksimap-logo-white': [
        { name: 'small', width: 240, height: 60, suffix: '240x60' },
        { name: 'medium', width: 480, height: 120, suffix: '480x120' },
        { name: 'large', width: 960, height: 240, suffix: '960x240' },
        { name: 'xlarge', width: 1920, height: 480, suffix: '1920x480' }
    ],
    'teksimap-icon': [
        { name: 'small', width: 200, height: 200, suffix: '200x200' },
        { name: 'medium', width: 400, height: 400, suffix: '400x400' },
        { name: 'large', width: 800, height: 800, suffix: '800x800' },
        { name: 'xlarge', width: 1600, height: 1600, suffix: '1600x1600' }
    ]
};

// Create output directory
const outputDir = path.join(__dirname, 'logos-png');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function generatePNGLogos() {
    console.log('🎯 TeksiMap Logo PNG Generator');
    console.log('================================\n');

    let totalGenerated = 0;

    for (const [logoName, svgContent] of Object.entries(logos)) {
        console.log(`📘 Processing ${logoName}...`);
        
        const logoConfigs = sizes[logoName];
        
        for (const config of logoConfigs) {
            try {
                // Update SVG dimensions
                const updatedSVG = svgContent
                    .replace(/width="[^"]*"/, `width="${config.width}"`)
                    .replace(/height="[^"]*"/, `height="${config.height}"`);

                // Convert SVG to PNG
                const pngBuffer = await sharp(Buffer.from(updatedSVG))
                    .png()
                    .toBuffer();

                // Save PNG file
                const filename = `${logoName}-${config.suffix}.png`;
                const filepath = path.join(outputDir, filename);
                
                fs.writeFileSync(filepath, pngBuffer);
                
                console.log(`  ✅ Generated: ${filename} (${config.width}x${config.height})`);
                totalGenerated++;
                
            } catch (error) {
                console.log(`  ❌ Error generating ${logoName}-${config.suffix}.png:`, error.message);
            }
        }
        console.log('');
    }

    console.log('🎉 PNG Generation Complete!');
    console.log(`📊 Total files generated: ${totalGenerated}`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log('\n📋 Usage Instructions:');
    console.log('1. Use 240x60 or 480x120 for PowerPoint headers');
    console.log('2. Use 960x240 or 1920x480 for high-resolution presentations');
    console.log('3. Use 200x200 or 400x400 for profile pictures/icons');
    console.log('4. Use white versions for dark backgrounds');
    console.log('5. Use advanced versions for light backgrounds');
}

// Run the generator
generatePNGLogos().catch(console.error);

