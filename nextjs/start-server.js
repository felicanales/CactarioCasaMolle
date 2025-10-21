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
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

console.log('🔍 Railway Frontend Deployment');
console.log('================================');
console.log(`📍 Current directory: ${process.cwd()}`);
console.log(`🌐 Server will listen on: ${HOSTNAME}:${PORT}`);
console.log(`🔐 PORT from Railway: ${process.env.PORT || '(not set, using 3000)'}`);
console.log('');

// Possible locations for server.js in standalone build
const possiblePaths = [
    '.next/standalone/nextjs/server.js',     // Monorepo with outputFileTracingRoot
    '.next/standalone/server.js',             // Standard standalone
    '../.next/standalone/nextjs/server.js',   // Alternative monorepo structure
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

