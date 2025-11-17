#!/usr/bin/env node

/**
 * Copy static assets for Next.js standalone mode
 * Replaces copy-assets.sh for cross-platform compatibility
 */

const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`⚠️  ${src} not found`);
        return;
    }

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('📦 Copying static assets for standalone mode...');

// Ensure directories exist
const staticSource = '.next/static';
const staticDest = '.next/standalone/nextjs/.next/static';
const publicSource = 'public';
const publicDest = '.next/standalone/nextjs/public';

// Copy static files
if (fs.existsSync(staticSource)) {
    console.log('✅ Copying .next/static...');
    copyDir(staticSource, staticDest);
} else {
    console.warn('⚠️  .next/static not found');
}

// Copy public files
if (fs.existsSync(publicSource)) {
    console.log('✅ Copying public...');
    copyDir(publicSource, publicDest);
} else {
    console.warn('⚠️  public directory not found');
}

// List what was copied for verification
if (fs.existsSync('.next/standalone/nextjs')) {
    console.log('📂 Standalone structure:');
    try {
        const files = fs.readdirSync('.next/standalone/nextjs');
        files.forEach(file => {
            console.log(`   - ${file}`);
        });
    } catch (error) {
        // Ignore if can't list
    }
}

console.log('✅ Asset copying complete');

