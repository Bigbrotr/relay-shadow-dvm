// src/scripts/start-dvm.js
import { RelayShadowDVM } from '../dvm/RelayShadowDVM.js';
import { startApiServer } from '../api/server.js';
import config from '../dvm/config.js';

async function startDVM() {
    console.log('🔮 Starting Relay Shadow DVM...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Display configuration
        console.log(`🔑 DVM Public Key: ${config.publicKey}`);
        console.log(`🌐 Monitoring ${config.dvmRelays.length} relays:`);
        config.dvmRelays.forEach(relay => console.log(`   • ${relay.trim()}`));
        console.log(`🗃️  Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
        console.log(`🎯 Environment: ${config.server.nodeEnv}`);
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

        // Start API server for client communication
        console.log('🌐 Starting API server...');
        startApiServer();

        // Initialize and start DVM
        const dvm = new RelayShadowDVM(config);
        await dvm.start();

        console.log('🎉 Relay Shadow DVM is now running!');
        console.log('📡 Listening for DVM requests...');
        console.log('💡 Send requests with kind 5600 mentioning this DVM');

        console.log('\n✨ Ready to provide privacy-focused relay recommendations!');
        console.log(`📱 Client can connect at: http://localhost:${config.server.clientPort}`);
        console.log(`🔗 DVM info available at: http://localhost:${config.server.port}/api/dvm/info`);

        // Display example usage
        console.log('\n🧪 Test commands:');
        console.log(`npm run test:recommend`);
        console.log(`npm run client:dev`);

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