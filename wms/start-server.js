#!/usr/bin/env node

/**
 * Standalone server starter for Railway
 * Handles different possible locations of server.js in monorepo setup
 * Ensures PORT environment variable is set for Railway
 */

const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Railway provides PORT, default to 3000 for local development
const PORT = process.env.PORT || 3000;
// MUST be 0.0.0.0 for Railway (ignore any other HOSTNAME env var)
const HOSTNAME = '0.0.0.0';

console.log('🔍 Railway Frontend Deployment');
console.log('================================');
console.log(`📍 Current directory: ${process.cwd()}`);
console.log(`🌐 Server will listen on: ${HOSTNAME}:${PORT}`);
console.log(`🔐 PORT from Railway: ${process.env.PORT || '(not set, using 3000)'}`);
console.log('');

// Debug: List directory structure
function listDirectory(dir, depth = 0, maxDepth = 3) {
    if (depth > maxDepth) return;
    try {
        if (fs.existsSync(dir)) {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            const indent = '  '.repeat(depth);
            console.log(`${indent}📁 ${path.basename(dir)}/`);
            items.forEach(item => {
                const fullPath = path.join(dir, item.name);
                if (item.isDirectory()) {
                    listDirectory(fullPath, depth + 1, maxDepth);
                } else {
                    console.log(`${indent}  📄 ${item.name}`);
                }
            });
        }
    } catch (error) {
        console.log(`${'  '.repeat(depth)}❌ Error reading ${dir}: ${error.message}`);
    }
}

console.log('🔍 Checking build output structure...');
if (fs.existsSync('.next')) {
    console.log('📁 .next directory exists');
    listDirectory('.next', 0, 2);
} else {
    console.log('❌ .next directory does NOT exist - build may have failed');
}
console.log('');

function copyStaticFiles() {
    console.log('🔍 Checking for static files...');

    // Detect standalone directory structure first
    let standaloneDir = null;
    if (existsSync('.next/standalone/nextjs')) {
        standaloneDir = '.next/standalone/nextjs';
        console.log('📁 Detected monorepo structure: .next/standalone/nextjs');
    } else if (existsSync('.next/standalone')) {
        standaloneDir = '.next/standalone';
        console.log('📁 Detected standard structure: .next/standalone');
    } else {
        console.warn('⚠️  Standalone directory not found, skipping file copy');
        return;
    }

    const staticSource = '.next/static';
    const staticDest = path.join(standaloneDir, '.next/static');
    const publicSource = 'public';
    const publicDest = path.join(standaloneDir, 'public');

    try {
        if (existsSync(staticSource) && !existsSync(staticDest)) {
            console.log(`📦 Copying .next/static to ${staticDest}...`);
            fs.cpSync(staticSource, staticDest, { recursive: true });
            console.log('   ✅ Static files copied');
        }

        if (existsSync(publicSource) && !existsSync(publicDest)) {
            console.log(`📦 Copying public to ${publicDest}...`);
            fs.cpSync(publicSource, publicDest, { recursive: true });
            console.log('   ✅ Public files copied');
        }
    } catch (error) {
        console.warn('⚠️  Error copying files:', error.message);
    }
}

// Run copy before checking server paths
copyStaticFiles();

// Possible locations for server.js in standalone build
const possiblePaths = [
    '.next/standalone/server.js',             // Standard standalone (most common)
    '.next/standalone/nextjs/server.js',      // Monorepo structure
    '.next/standalone/.next/server.js',       // Alternative structure
];

console.log('🔍 Searching for standalone server.js...');

let serverPath = null;

// Check each possible path
for (const possiblePath of possiblePaths) {
    const fullPath = resolve(possiblePath);
    console.log(`   Checking: ${fullPath}`);
    if (existsSync(fullPath)) {
        serverPath = fullPath;
        console.log(`   ✅ Found: ${fullPath}`);
        break;
    } else {
        console.log(`   ❌ Not found: ${fullPath}`);
    }
}

// If not found in standard locations, search recursively
if (!serverPath) {
    console.log('🔍 Searching recursively in .next/standalone...');
    const standaloneDir = '.next/standalone';
    if (existsSync(standaloneDir)) {
        function findServerJs(dir, depth = 0) {
            if (depth > 3) return null; // Limit recursion depth
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isFile() && entry.name === 'server.js') {
                        return resolve(fullPath);
                    }
                    if (entry.isDirectory() && !entry.name.startsWith('.')) {
                        const found = findServerJs(fullPath, depth + 1);
                        if (found) return found;
                    }
                }
            } catch (error) {
                // Ignore errors
            }
            return null;
        }
        const found = findServerJs(standaloneDir);
        if (found) {
            serverPath = found;
            console.log(`   ✅ Found recursively: ${found}`);
        }
    }
}

if (!serverPath) {
    console.error('');
    console.error('❌ ERROR: Could not find server.js in any expected location');
    console.error('Searched paths:');
    possiblePaths.forEach(p => console.error(`  - ${resolve(p)}`));
    console.error('');
    console.error('💡 TIP: Make sure "npm run build" completed successfully');
    console.error('💡 TIP: Check that output: "standalone" is set in next.config.mjs');
    process.exit(1);
}

console.log('');
console.log(`🚀 Starting Next.js standalone server...`);
console.log(`   Server file: ${serverPath}`);
console.log(`   Listening on: http://${HOSTNAME}:${PORT}`);
console.log('');

// Ensure environment variables are set correctly for Next.js standalone
const env = {
    ...process.env,
    PORT: PORT.toString(),
    HOSTNAME: HOSTNAME,
};

// Start the server
const child = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: env,
    cwd: process.cwd()
});

child.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});

child.on('exit', (code) => {
    if (code !== 0) {
        console.error(`❌ Server exited with code ${code}`);
    }
    process.exit(code);
});
