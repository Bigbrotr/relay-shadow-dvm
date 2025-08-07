// src/scripts/start-dvm.js
import { RelayShadowDVM } from '../dvm/RelayShadowDVM.js';
import { generatePrivateKey, getPublicKey } from 'nostr-tools';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function startDVM() {
    console.log('🔮 Starting Relay Shadow DVM...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Create configuration directly here to avoid import issues
        const config = {
            // Database Configuration
            database: {
                user: process.env.DB_USER || 'postgres',
                host: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'bigbrotr',
                password: process.env.DB_PASSWORD,
                port: parseInt(process.env.DB_PORT) || 5432,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            },

            // DVM Configuration
            privateKey: process.env.DVM_PRIVATE_KEY || generatePrivateKey(),
            dvmRelays: (process.env.DVM_RELAYS || 'wss://relay.damus.io,wss://relay.snort.social,wss://nos.lol').split(','),
        };

        // Validate configuration
        if (!config.database.password) {
            console.warn('⚠️  Warning: No database password provided. Set DB_PASSWORD in .env file');
        }

        if (!process.env.DVM_PRIVATE_KEY) {
            console.warn('⚠️  Warning: Using generated private key. Set DVM_PRIVATE_KEY in .env for persistence');
            console.log(`🔑 Generated private key: ${config.privateKey}`);
        }

        // Display configuration
        const publicKey = getPublicKey(config.privateKey);
        console.log(`🔑 DVM Public Key: ${publicKey}`);
        console.log(`🌐 Monitoring ${config.dvmRelays.length} relays:`);
        config.dvmRelays.forEach(relay => console.log(`   • ${relay.trim()}`));
        console.log(`🗃️  Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
        console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Test database connection first
        console.log('🔌 Testing database connection...');
        const { Pool } = await import('pg');
        const testPool = new Pool(config.database);

        try {
            const client = await testPool.connect();
            await client.query('SELECT 1');
            client.release();
            console.log('✅ Database connection successful');
        } catch (dbError) {
            console.error('❌ Database connection failed:', dbError.message);

            if (dbError.code === 'ECONNREFUSED') {
                console.log('\n💡 Database connection troubleshooting:');
                console.log('   • Check if PostgreSQL is running');
                console.log('   • Verify DB_HOST and DB_PORT in .env file');
                console.log('   • Ensure database credentials are correct');
                console.log('   • Make sure the bigbrotr database exists');
            }

            process.exit(1);
        } finally {
            await testPool.end();
        }

        // Initialize DVM
        const dvm = new RelayShadowDVM(config);

        // Start listening for requests
        await dvm.start();

        console.log('🎉 Relay Shadow DVM is now running!');
        console.log('📡 Listening for DVM requests...');
        console.log('💡 Send requests with kind 5600 mentioning this DVM');
        console.log('\n✨ Ready to provide privacy-focused relay recommendations!');

        // Display example request
        console.log('\n📝 Example request format:');
        console.log(JSON.stringify({
            kind: 5600,
            content: "recommend private relays",
            tags: [
                ["p", publicKey],
                ["param", "threat_level", "high"],
                ["param", "use_case", "journalism"],
                ["param", "max_results", "10"]
            ]
        }, null, 2));

        console.log('\n🧪 Test with CLI:');
        console.log(`node src/scripts/test-client.js --dvm-pubkey ${publicKey} --request-type recommend --threat-level medium`);

    } catch (error) {
        console.error('❌ Failed to start DVM:', error.message);
        console.error('Stack trace:', error.stack);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Database connection failed. Check your .env file and run setup:');
            console.log('   cp .env.example .env');
            console.log('   # Edit .env with your database credentials');
            console.log('   npm run setup');
        }

        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Relay Shadow DVM...');
    console.log('👋 Goodbye!');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the DVM
startDVM().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});