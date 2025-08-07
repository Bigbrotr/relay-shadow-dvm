// src/scripts/start-dvm.js
import { RelayShadowDVM } from '../dvm/RelayShadowDVM.js';
import { getPublicKey } from 'nostr-tools';
import config from '../dvm/config.js';

async function startDVM() {
    console.log('🔮 Starting Relay Shadow DVM...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Display configuration
    const publicKey = getPublicKey(config.dvm.privateKey);
    console.log(`🔑 DVM Public Key: ${publicKey}`);
    console.log(`🌐 Monitoring ${config.dvm.relays.length} relays:`);
    config.dvm.relays.forEach(relay => console.log(`   • ${relay}`));
    console.log(`🗃️  Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
    console.log(`🎯 Environment: ${config.server.nodeEnv}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Initialize DVM
        const dvm = new RelayShadowDVM(config);

        // Start listening for requests
        await dvm.start();

        console.log('🎉 Relay Shadow DVM is now running!');
        console.log('📡 Listening for DVM requests...');
        console.log('💡 Send requests with kind 5600 mentioning this DVM');
        console.log('\n✨ Ready to provide privacy-focused relay recommendations!');

        // Display example request
        console.log('\n📝 Example request:');
        console.log(JSON.stringify({
            kind: 5600,
            content: "recommend private relays",
            tags: [
                ["p", publicKey],
                ["param", "threat_level", "high"],
                ["param", "use_case", "journalism"]
            ]
        }, null, 2));

    } catch (error) {
        console.error('❌ Failed to start DVM:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Database connection failed. Run setup first:');
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

// Start the DVM
startDVM().catch(console.error);