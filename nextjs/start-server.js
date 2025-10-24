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

// Copy static files if they don't exist in standalone directory
const fs = require('fs');
const path = require('path');

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

// Use our custom server.js instead of the standalone one
const customServerPath = resolve('./server.js');

console.log('🔍 Using custom server.js for Railway...');
console.log(`   Server file: ${customServerPath}`);

if (!existsSync(customServerPath)) {
    console.error('');
    console.error('❌ ERROR: Custom server.js not found');
    console.error(`   Expected: ${customServerPath}`);
    console.error('');
    process.exit(1);
}

console.log('');
console.log(`🚀 Starting Next.js server...`);
console.log(`   Server file: ${customServerPath}`);
console.log(`   Listening on: http://${HOSTNAME}:${PORT}`);
console.log('');

// Ensure environment variables are set correctly for Next.js
const env = {
    ...process.env,
    PORT: PORT.toString(),
    HOSTNAME: HOSTNAME,
    NODE_ENV: 'production',
};

console.log(`🔧 Environment variables for Next.js:`);
console.log(`   PORT: ${env.PORT}`);
console.log(`   HOSTNAME: ${env.HOSTNAME}`);
console.log(`   NODE_ENV: ${env.NODE_ENV}`);
console.log('');

// Start the server
const child = spawn('node', [customServerPath], {
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

