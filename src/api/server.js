// src/api/server.js
import express from 'express';
import cors from 'cors';
import config from '../dvm/config.js';

const app = express();

// Enable CORS for client
app.use(cors({
    origin: [`http://localhost:${config.server.clientPort}`, 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// DVM info endpoint for client
app.get('/api/dvm/info', (req, res) => {
    res.json({
        publicKey: config.publicKey,
        relays: config.dvmRelays,
        supportedRequests: ['recommend', 'analyze', 'discover', 'health'],
        threatLevels: ['low', 'medium', 'high', 'nation-state'],
        maxResults: config.algorithm.maxRecommendations
    });
});

// Start API server
export function startApiServer() {
    const port = config.server.port;

    app.listen(port, () => {
        console.log(`🌐 API Server running on http://localhost:${port}`);
        console.log(`📡 DVM Public Key: ${config.publicKey}`);
        console.log(`🔗 Client can fetch DVM info from: http://localhost:${port}/api/dvm/info`);
    });

    return app;
}

export default app;