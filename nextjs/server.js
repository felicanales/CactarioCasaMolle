#!/usr/bin/env node

/**
 * Custom server wrapper for Next.js standalone on Railway
 * This ensures the server listens on the correct port and hostname
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Get port and hostname from environment
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';

console.log('🚀 Starting Next.js server for Railway');
console.log(`📍 Port: ${PORT}`);
console.log(`📍 Hostname: ${HOSTNAME}`);
console.log(`📍 Environment: ${process.env.NODE_ENV}`);
console.log('');

// Create Next.js app
const app = next({ dev, hostname: HOSTNAME, port: PORT });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    }).listen(PORT, HOSTNAME, (err) => {
        if (err) throw err;
        console.log(`✅ Ready on http://${HOSTNAME}:${PORT}`);
    });
});
