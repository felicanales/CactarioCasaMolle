#!/usr/bin/env node

/**
 * Standalone server starter for Railway
 * Handles different possible locations of server.js in monorepo setup
 * Ensures PORT environment variable is set for Railway
 */

const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawn } = require('child_process');

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
const fs = require('fs');
const path = require('path');

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

    const staticSource = '.next/static';
    const staticDest = '.next/standalone/nextjs/.next/static';
    const publicSource = 'public';
    const publicDest = '.next/standalone/nextjs/public';

    try {
        if (existsSync(staticSource) && !existsSync(staticDest)) {
            console.log('📦 Copying .next/static to standalone...');
            fs.cpSync(staticSource, staticDest, { recursive: true });
            console.log('   ✅ Static files copied');
        }

        if (existsSync(publicSource) && !existsSync(publicDest)) {
            console.log('📦 Copying public to standalone...');
            fs.cpSync(publicSource, publicDest, { recursive: true });
            console.log('   ✅ Public files copied');
        }
    } catch (error) {
        console.warn('⚠️  Error copying files:', error.message);
    }
}

// Run copy before checking server paths
copyStaticFiles();

// Detect standalone directory first
let standaloneBase = null;
if (existsSync('.next/standalone/nextjs')) {
    standaloneBase = '.next/standalone/nextjs';
    console.log('📁 Detected monorepo structure: .next/standalone/nextjs');
} else if (existsSync('.next/standalone')) {
    standaloneBase = '.next/standalone';
    console.log('📁 Detected standard structure: .next/standalone');
} else {
    console.error('❌ ERROR: Standalone directory not found!');
    console.error('   Searched: .next/standalone and .next/standalone/nextjs');
    process.exit(1);
}

// Possible locations for server.js in standalone build
const possiblePaths = [
    path.join(standaloneBase, 'server.js'),   // Most common location
    '.next/standalone/server.js',             // Fallback
    '.next/standalone/nextjs/server.js',      // Fallback
];

console.log('🔍 Searching for standalone server.js...');

let serverPath = null;

for (const path of possiblePaths) {
    const fullPath = resolve(path);
    console.log(`   Checking: ${fullPath}`);
    if (existsSync(fullPath)) {
        serverPath = fullPath;
        console.log(`   ✅ Found: ${fullPath}`);
        break;
    } else {
        console.log(`   ❌ Not found: ${fullPath}`);
    }
}

if (!serverPath) {
    console.error('');
    console.error('❌ ERROR: Could not find server.js in any expected location');
    console.error('Searched paths:');
    possiblePaths.forEach(p => console.error(`  - ${resolve(p)}`));
    console.error('');
    console.error('💡 TIP: Make sure "npm run build" completed successfully');
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

