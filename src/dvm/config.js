// src/dvm/config.js
import dotenv from 'dotenv';
import { generatePrivateKey } from 'nostr-tools';

dotenv.config();

export const config = {
    // Database Configuration
    database: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'bigbrotr',
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT) || 5432,
        max: 10, // Connection pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    },

    // DVM Configuration
    dvm: {
        privateKey: process.env.DVM_PRIVATE_KEY || generatePrivateKey(),
        relays: (process.env.DVM_RELAYS || 'wss://relay.damus.io,wss://relay.snort.social').split(','),
        requestKind: 5600,
        responseKind: 6600,
        jobRequestKind: 68001,
    },

    // Server Configuration
    server: {
        port: parseInt(process.env.PORT) || 3001,
        logLevel: process.env.LOG_LEVEL || 'info',
        nodeEnv: process.env.NODE_ENV || 'development',
    },

    // Algorithm Parameters
    algorithm: {
        maxRecommendations: 10,
        minRelayScore: 5.0,
        socialGraphWeight: 0.4,
        privacyWeight: 0.25,
        reliabilityWeight: 0.20,
        performanceWeight: 0.15,
    }
};

// Validation
if (!config.database.password) {
    console.warn('⚠️  Warning: No database password provided. Set DB_PASSWORD in .env file');
}

if (!process.env.DVM_PRIVATE_KEY) {
    console.warn('⚠️  Warning: Using generated private key. Set DVM_PRIVATE_KEY in .env for persistence');
    console.log(`🔑 Generated private key: ${config.dvm.privateKey}`);
}

export default config;