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

// Detect standalone directory structure
let standaloneDir = null;
if (fs.existsSync('.next/standalone/nextjs')) {
    standaloneDir = '.next/standalone/nextjs';
    console.log('📁 Detected monorepo structure: .next/standalone/nextjs');
} else if (fs.existsSync('.next/standalone')) {
    standaloneDir = '.next/standalone';
    console.log('📁 Detected standard structure: .next/standalone');
} else {
    console.error('❌ ERROR: Standalone directory not found!');
    console.error('   Expected: .next/standalone or .next/standalone/nextjs');
    console.error('   Make sure "npm run build" completed successfully');
    process.exit(1);
}

// Ensure directories exist
const staticSource = '.next/static';
const staticDest = path.join(standaloneDir, '.next/static');
const publicSource = 'public';
const publicDest = path.join(standaloneDir, 'public');

// Copy static files
if (fs.existsSync(staticSource)) {
    console.log(`✅ Copying .next/static to ${staticDest}...`);
    copyDir(staticSource, staticDest);
} else {
    console.warn('⚠️  .next/static not found');
}

// Copy public files
if (fs.existsSync(publicSource)) {
    console.log(`✅ Copying public to ${publicDest}...`);
    copyDir(publicSource, publicDest);
} else {
    console.warn('⚠️  public directory not found');
}

// List what was copied for verification
if (standaloneDir && fs.existsSync(standaloneDir)) {
    console.log(`📂 Standalone structure (${standaloneDir}):`);
    try {
        const files = fs.readdirSync(standaloneDir);
        files.forEach(file => {
            const filePath = path.join(standaloneDir, file);
            const stat = fs.statSync(filePath);
            const type = stat.isDirectory() ? '📁' : '📄';
            console.log(`   ${type} ${file}`);
        });
    } catch (error) {
        console.warn(`⚠️  Could not list ${standaloneDir}:`, error.message);
    }
}

console.log('✅ Asset copying complete');

