#!/usr/bin/env node

/**
 * Standalone server starter for Railway
 * Handles different possible locations of server.js in monorepo setup
 */

const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawn } = require('child_process');

// Possible locations for server.js in standalone build
const possiblePaths = [
  '.next/standalone/nextjs/server.js',     // Monorepo with outputFileTracingRoot
  '.next/standalone/server.js',             // Standard standalone
  '../.next/standalone/nextjs/server.js',   // Alternative monorepo structure
];

console.log('🔍 Searching for standalone server.js...');
console.log('Current directory:', process.cwd());

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
  console.error('❌ ERROR: Could not find server.js in any expected location');
  console.error('Searched paths:');
  possiblePaths.forEach(p => console.error(`  - ${resolve(p)}`));
  process.exit(1);
}

console.log(`\n🚀 Starting Next.js standalone server from: ${serverPath}\n`);

// Start the server
const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code);
});

