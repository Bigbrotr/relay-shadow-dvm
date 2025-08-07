// src/scripts/setup-database.js
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../dvm/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
    const pool = new Pool(config.database);

    try {
        console.log('🔌 Connecting to BigBrotr database...');

        // Test connection
        const client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) FROM events');
        const eventCount = parseInt(result.rows[0].count);

        console.log(`✅ Connected! Found ${eventCount.toLocaleString()} events in database`);
        client.release();

        // Check if analytics tables exist
        const analyticsCheck = await pool.query(`
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_name IN ('relay_analytics', 'publisher_influence', 'relay_quality_scores')
        `);

        const analyticsTablesExist = parseInt(analyticsCheck.rows[0].table_count) === 3;

        if (!analyticsTablesExist) {
            console.log('📊 Creating analytics tables...');

            // Read and execute preprocessing SQL
            const preprocessingSql = readFileSync(
                join(__dirname, '../../database/preprocessing.sql'),
                'utf8'
            );

            await pool.query(preprocessingSql);
            console.log('✅ Analytics tables created successfully!');

            // Read and execute query functions
            const queryFunctionsSql = readFileSync(
                join(__dirname, '../../database/query-functions.sql'),
                'utf8'
            );

            await pool.query(queryFunctionsSql);
            console.log('✅ Query functions installed successfully!');

        } else {
            console.log('✅ Analytics tables already exist');

            // Refresh materialized views
            console.log('🔄 Refreshing analytics...');
            // await pool.query('SELECT refresh_relay_analytics()');
            console.log('✅ Analytics refreshed!');
        }

        // Test DVM functions
        console.log('🧪 Testing DVM functions...');
        const testResult = await pool.query(`
            SELECT COUNT(*) FROM relay_recommendations WHERE overall_score > 7.0
        `);

        const highQualityRelays = parseInt(testResult.rows[0].count);
        console.log(`✅ Found ${highQualityRelays} high-quality relays for recommendations`);

        // Display setup summary
        console.log('\n🎉 Database setup complete!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Total events: ${eventCount.toLocaleString()}`);
        console.log(`🔍 High-quality relays: ${highQualityRelays}`);
        console.log(`🛡️  Privacy-focused DVM ready to serve recommendations`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Troubleshooting:');
            console.log('   • Check if PostgreSQL is running');
            console.log('   • Verify DB_HOST and DB_PORT in .env file');
            console.log('   • Ensure database credentials are correct');
        }

        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const preprocessOnly = args.includes('--preprocess-only');

if (preprocessOnly) {
    console.log('🔧 Running preprocessing only...');
}

setupDatabase().catch(console.error);