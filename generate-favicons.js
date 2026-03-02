#!/usr/bin/env node

/**
 * PVRPOSE AI Favicon Generator
 * Generates all required favicon files from source logo
 *
 * Usage: node generate-favicons.js
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 PVRPOSE AI Favicon Generator\n');

// Check for required dependencies
const missingDeps = [];

try {
    require.resolve('canvas');
} catch (e) {
    missingDeps.push('canvas');
}

if (missingDeps.length > 0) {
    console.log('❌ Missing dependencies. Please install:');
    console.log(`   npm install ${missingDeps.join(' ')}\n`);
    console.log('Or use one of these alternatives:');
    console.log('1. Open generate-favicons.html in your browser');
    console.log('2. Use https://realfavicongenerator.net/');
    console.log('3. Follow instructions in FAVICON-GENERATION-INSTRUCTIONS.md\n');
    process.exit(1);
}

const { createCanvas, loadImage } = require('canvas');

const SOURCE_FILE = 'logos-ai-rez-01.png';
const SIZES = [
    { name: 'favicon-16x16.png', width: 16, height: 16 },
    { name: 'favicon-32x32.png', width: 32, height: 32 },
    { name: 'apple-touch-icon.png', width: 180, height: 180 },
    { name: 'android-chrome-192x192.png', width: 192, height: 192 },
    { name: 'android-chrome-512x512.png', width: 512, height: 512 },
];

async function generateFavicons() {
    try {
        // Check source file exists
        if (!fs.existsSync(SOURCE_FILE)) {
            console.error(`❌ Error: ${SOURCE_FILE} not found!`);
            console.log('   Make sure you run this script in the correct directory.\n');
            process.exit(1);
        }

        console.log(`📁 Loading source image: ${SOURCE_FILE}...`);
        const sourceImage = await loadImage(SOURCE_FILE);
        console.log(`✅ Source image loaded: ${sourceImage.width}x${sourceImage.height}\n`);

        // Generate each size
        for (const size of SIZES) {
            console.log(`🔄 Generating ${size.name} (${size.width}x${size.height})...`);

            const canvas = createCanvas(size.width, size.height);
            const ctx = canvas.getContext('2d');

            // Fill with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size.width, size.height);

            // Draw resized image
            ctx.drawImage(sourceImage, 0, 0, size.width, size.height);

            // Save as PNG
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(size.name, buffer);

            console.log(`   ✅ Saved: ${size.name}`);
        }

        // Generate OG image (1200x630)
        console.log('\n🔄 Generating og-image.png (1200x630) for social media...');
        const ogCanvas = createCanvas(1200, 630);
        const ogCtx = ogCanvas.getContext('2d');

        // White background
        ogCtx.fillStyle = '#ffffff';
        ogCtx.fillRect(0, 0, 1200, 630);

        // Calculate logo size (60% of height)
        const logoHeight = 630 * 0.6;
        const logoWidth = (sourceImage.width / sourceImage.height) * logoHeight;
        const x = (1200 - logoWidth) / 2;
        const y = (630 - logoHeight) / 2;

        // Draw centered logo
        ogCtx.drawImage(sourceImage, x, y, logoWidth, logoHeight);

        // Save OG image
        const ogBuffer = ogCanvas.toBuffer('image/png');
        fs.writeFileSync('og-image.png', ogBuffer);
        console.log('   ✅ Saved: og-image.png');

        // Summary
        console.log('\n✅ All favicon images generated successfully!\n');
        console.log('Generated files:');
        SIZES.forEach(size => console.log(`   • ${size.name}`));
        console.log('   • og-image.png');
        console.log('\n📝 Note: For favicon.ico, use an online converter:');
        console.log('   https://www.favicon-generator.org/');
        console.log('   Upload favicon-32x32.png to create favicon.ico\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the generator
generateFavicons();
