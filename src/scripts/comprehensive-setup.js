#!/usr/bin/env node

// Comprehensive Setup and Preprocessing Script
// Ensures everything is computed and ready for the hackathon

import { Pool } from 'pg';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../dvm/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ComprehensiveSetup {
    constructor() {
        this.pool = new Pool(config.database);
        this.startTime = Date.now();
        this.steps = [];
        this.errors = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const emoji = {
            info: '📋',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            progress: '⏳'
        };

        console.log(`${emoji[type]} [${timestamp}] ${message}`);

        this.steps.push({
            timestamp,
            type,
            message,
            duration: Date.now() - this.startTime
        });
    }

    async runStep(name, fn) {
        const stepStart = Date.now();
        this.log(`Starting: ${name}`, 'progress');

        try {
            const result = await fn();
            const duration = Date.now() - stepStart;
            this.log(`Completed: ${name} (${duration}ms)`, 'success');
            return result;
        } catch (error) {
            const duration = Date.now() - stepStart;
            this.log(`Failed: ${name} - ${error.message} (${duration}ms)`, 'error');
            this.errors.push({ step: name, error: error.message, duration });
            throw error;
        }
    }

    async checkDatabaseConnection() {
        return await this.runStep('Database Connection Check', async () => {
            const client = await this.pool.connect();
            const result = await client.query('SELECT version()');
            client.release();

            this.log(`Database connected: ${result.rows[0].version}`, 'info');
            return true;
        });
    }

    async checkDataAvailability() {
        return await this.runStep('Data Availability Check', async () => {
            const queries = [
                { name: 'Events', query: 'SELECT COUNT(*) FROM events' },
                { name: 'Relays', query: 'SELECT COUNT(*) FROM relays' },
                { name: 'Events-Relays Relations', query: 'SELECT COUNT(*) FROM events_relays' },
                { name: 'Relay Metadata', query: 'SELECT COUNT(*) FROM relay_metadata' }
            ];

            const results = {};
            for (const { name, query } of queries) {
                const result = await this.pool.query(query);
                const count = parseInt(result.rows[0].count);
                results[name] = count;
                this.log(`${name}: ${count.toLocaleString()} records`, 'info');
            }

            // Validate minimum data requirements
            if (results.Events < 1000) {
                throw new Error(`Insufficient events data: ${results.Events} (minimum: 1000)`);
            }
            if (results.Relays < 10) {
                throw new Error(`Insufficient relays data: ${results.Relays} (minimum: 10)`);
            }

            return results;
        });
    }

    async createAnalyticsTables() {
        return await this.runStep('Analytics Tables Creation', async () => {
            // Read preprocessing SQL
            const preprocessingSql = readFileSync(
                join(__dirname, '../../database/preprocessing.sql'),
                'utf8'
            );

            this.log('Executing preprocessing SQL...', 'progress');
            await this.pool.query(preprocessingSql);

            // Verify tables were created
            const tables = [
                'relay_analytics',
                'publisher_influence',
                'relay_publisher_weights',
                'relay_quality_scores'
            ];

            for (const table of tables) {
                const result = await this.pool.query(`
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_name = $1
                `, [table]);

                if (parseInt(result.rows[0].count) === 0) {
                    throw new Error(`Table ${table} was not created`);
                }

                // Get record count
                const countResult = await this.pool.query(`SELECT COUNT(*) FROM ${table}`);
                const count = parseInt(countResult.rows[0].count);
                this.log(`${table}: ${count.toLocaleString()} records`, 'info');
            }

            return true;
        });
    }

    async installQueryFunctions() {
        return await this.runStep('DVM Query Functions Installation', async () => {
            // Read query functions SQL
            const queryFunctionsSql = readFileSync(
                join(__dirname, '../../database/query-functions.sql'),
                'utf8'
            );

            this.log('Installing DVM query functions...', 'progress');
            await this.pool.query(queryFunctionsSql);

            // Test each function
            const functions = [
                'get_user_relay_recommendations',
                'analyze_user_current_relays',
                'get_discovery_relays',
                'get_relay_health_summary',
                // 'refresh_relay_analytics'
            ];

            for (const func of functions) {
                const result = await this.pool.query(`
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.routines 
                        WHERE routine_name = $1 AND routine_type = 'FUNCTION'
                    )
                `, [func]);

                if (!result.rows[0].exists) {
                    throw new Error(`Function ${func} was not created`);
                }
                this.log(`Function ${func} installed`, 'info');
            }

            return true;
        });
    }

    async createMaterializedViews() {
        return await this.runStep('Materialized Views Creation', async () => {
            // Create and refresh materialized views
            this.log('Creating relay_recommendations materialized view...', 'progress');

            // The view should already be created by preprocessing.sql
            const result = await this.pool.query(`
                SELECT COUNT(*) FROM information_schema.views 
                WHERE table_name = 'relay_recommendations'
            `);

            if (parseInt(result.rows[0].count) === 0) {
                throw new Error('relay_recommendations materialized view not found');
            }

            // Refresh the view
            await this.pool.query('REFRESH MATERIALIZED VIEW relay_recommendations');

            // Get count
            const countResult = await this.pool.query('SELECT COUNT(*) FROM relay_recommendations');
            const count = parseInt(countResult.rows[0].count);
            this.log(`relay_recommendations view: ${count.toLocaleString()} relays`, 'info');

            return count;
        });
    }

    async testDVMFunctions() {
        return await this.runStep('DVM Functions Testing', async () => {
            // Test recommendation function with sample data
            this.log('Testing recommendation function...', 'progress');

            // Get a sample pubkey from events
            const pubkeyResult = await this.pool.query(`
                SELECT pubkey FROM events WHERE kind = 0 LIMIT 1
            `);

            if (pubkeyResult.rows.length === 0) {
                throw new Error('No profile events found for testing');
            }

            const samplePubkey = pubkeyResult.rows[0].pubkey;

            // Test recommendations
            const recResult = await this.pool.query(`
                SELECT * FROM get_user_relay_recommendations($1, 'medium', 5, true)
            `, [samplePubkey]);

            this.log(`Recommendations test: ${recResult.rows.length} results`, 'info');

            // Test analysis function
            const analysisResult = await this.pool.query(`
                SELECT * FROM analyze_user_current_relays($1, ARRAY['wss://relay.damus.io'])
            `, [samplePubkey]);

            this.log(`Analysis test: ${analysisResult.rows.length} metrics`, 'info');

            // Test health summary
            const healthResult = await this.pool.query('SELECT * FROM get_relay_health_summary() LIMIT 10');
            this.log(`Health summary test: ${healthResult.rows.length} relays`, 'info');

            return {
                recommendations: recResult.rows.length,
                analysis: analysisResult.rows.length,
                health: healthResult.rows.length
            };
        });
    }

    async optimizeDatabase() {
        return await this.runStep('Database Optimization', async () => {
            this.log('Running ANALYZE on all tables...', 'progress');

            const tables = [
                'events', 'relays', 'events_relays', 'relay_metadata',
                'relay_analytics', 'publisher_influence',
                'relay_publisher_weights', 'relay_quality_scores'
            ];

            for (const table of tables) {
                await this.pool.query(`ANALYZE ${table}`);
                this.log(`Analyzed table: ${table}`, 'info');
            }

            // Check index usage
            this.log('Checking index statistics...', 'progress');
            const indexResult = await this.pool.query(`
                SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
                FROM pg_stat_user_indexes 
                WHERE idx_tup_read > 0
                ORDER BY idx_tup_read DESC
                LIMIT 10
            `);

            this.log(`Active indexes: ${indexResult.rows.length}`, 'info');

            return true;
        });
    }

    async generateSampleData() {
        return await this.runStep('Sample Data Generation', async () => {
            // Generate some sample recommendations for different threat levels
            const threatLevels = ['low', 'medium', 'high', 'nation-state'];
            const samples = {};

            // Get sample pubkeys
            const pubkeysResult = await this.pool.query(`
                SELECT DISTINCT pubkey FROM events WHERE kind = 3 LIMIT 3
            `);

            if (pubkeysResult.rows.length === 0) {
                this.log('No contact list events found, using profile events', 'warning');
                const profileResult = await this.pool.query(`
                    SELECT DISTINCT pubkey FROM events WHERE kind = 0 LIMIT 3
                `);
                pubkeysResult.rows = profileResult.rows;
            }

            for (const level of threatLevels) {
                samples[level] = [];

                for (const { pubkey } of pubkeysResult.rows.slice(0, 2)) {
                    try {
                        const result = await this.pool.query(`
                            SELECT * FROM get_user_relay_recommendations($1, $2, 5, true)
                        `, [pubkey, level]);

                        samples[level].push({
                            pubkey: pubkey.substring(0, 8) + '...',
                            recommendations: result.rows.length,
                            topScore: result.rows[0]?.overall_score || 0
                        });
                    } catch (error) {
                        this.log(`Failed to generate sample for ${level}: ${error.message}`, 'warning');
                    }
                }
            }

            // Save samples to file for quick demo reference
            const sampleFile = join(__dirname, '../../sample-data.json');
            writeFileSync(sampleFile, JSON.stringify(samples, null, 2));
            this.log(`Sample data saved to ${sampleFile}`, 'info');

            return samples;
        });
    }

    async validateSystemReadiness() {
        return await this.runStep('System Readiness Validation', async () => {
            const checks = [];

            // Check high-quality relays count
            const highQualityResult = await this.pool.query(`
                SELECT COUNT(*) FROM relay_recommendations WHERE overall_score > 7.0
            `);
            const highQuality = parseInt(highQualityResult.rows[0].count);
            checks.push({ name: 'High-quality relays', value: highQuality, minimum: 10 });

            // Check publishers with influence
            const influencersResult = await this.pool.query(`
                SELECT COUNT(*) FROM publisher_influence WHERE influence_score > 3.0
            `);
            const influencers = parseInt(influencersResult.rows[0].count);
            checks.push({ name: 'Influential publishers', value: influencers, minimum: 100 });

            // Check recent events
            const recentResult = await this.pool.query(`
                SELECT COUNT(*) FROM events WHERE created_at > $1
            `, [Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)]); // Last 30 days
            const recent = parseInt(recentResult.rows[0].count);
            checks.push({ name: 'Recent events (30 days)', value: recent, minimum: 1000 });

            // Check relay diversity
            const diversityResult = await this.pool.query(`
                SELECT COUNT(DISTINCT ra.url) 
                FROM relay_analytics ra 
                WHERE ra.unique_publishers >= 5
            `);
            const diversity = parseInt(diversityResult.rows[0].count);
            checks.push({ name: 'Diverse relays (5+ publishers)', value: diversity, minimum: 20 });

            // Validate all checks
            const failures = checks.filter(check => check.value < check.minimum);

            for (const check of checks) {
                const status = check.value >= check.minimum ? 'success' : 'warning';
                this.log(`${check.name}: ${check.value.toLocaleString()} (min: ${check.minimum})`, status);
            }

            if (failures.length > 0) {
                this.log(`${failures.length} validation warnings found`, 'warning');
                for (const failure of failures) {
                    this.log(`⚠️  ${failure.name}: ${failure.value} < ${failure.minimum}`, 'warning');
                }
            } else {
                this.log('All system readiness checks passed!', 'success');
            }

            return { checks, failures: failures.length };
        });
    }

    async generatePrecomputedResponses() {
        return await this.runStep('Pre-computed Response Generation', async () => {
            // Generate cached responses for common scenarios
            const scenarios = [
                { name: 'casual-user', threatLevel: 'low', useCase: 'social' },
                { name: 'privacy-conscious', threatLevel: 'medium', useCase: 'general' },
                { name: 'journalist', threatLevel: 'high', useCase: 'journalism' },
                { name: 'activist', threatLevel: 'nation-state', useCase: 'activism' }
            ];

            const precomputed = {};

            // Get a representative user pubkey
            const userResult = await this.pool.query(`
                SELECT pubkey FROM events WHERE kind = 3 
                ORDER BY created_at DESC LIMIT 1
            `);

            if (userResult.rows.length === 0) {
                throw new Error('No contact list events found for pre-computation');
            }

            const userPubkey = userResult.rows[0].pubkey;

            for (const scenario of scenarios) {
                try {
                    // Generate recommendation
                    const recResult = await this.pool.query(`
                        SELECT * FROM get_user_relay_recommendations($1, $2, 8, true)
                    `, [userPubkey, scenario.threatLevel]);

                    // Generate health summary
                    const healthResult = await this.pool.query(`
                        SELECT * FROM get_relay_health_summary() LIMIT 20
                    `);

                    precomputed[scenario.name] = {
                        recommendations: recResult.rows,
                        health: healthResult.rows,
                        metadata: {
                            threatLevel: scenario.threatLevel,
                            useCase: scenario.useCase,
                            generated: new Date().toISOString(),
                            totalRelaysAnalyzed: recResult.rows.length
                        }
                    };

                    this.log(`Pre-computed ${scenario.name}: ${recResult.rows.length} recommendations`, 'info');

                } catch (error) {
                    this.log(`Failed to pre-compute ${scenario.name}: ${error.message}`, 'warning');
                }
            }

            // Save pre-computed responses
            const precomputedFile = join(__dirname, '../../precomputed-responses.json');
            writeFileSync(precomputedFile, JSON.stringify(precomputed, null, 2));
            this.log(`Pre-computed responses saved to ${precomputedFile}`, 'info');

            return precomputed;
        });
    }

    async generateSetupReport() {
        const duration = Date.now() - this.startTime;
        const report = {
            timestamp: new Date().toISOString(),
            duration: duration,
            steps: this.steps,
            errors: this.errors,
            summary: {
                totalSteps: this.steps.length,
                successfulSteps: this.steps.filter(s => s.type === 'success').length,
                warnings: this.steps.filter(s => s.type === 'warning').length,
                errors: this.errors.length
            }
        };

        const reportFile = join(__dirname, '../../setup-report.json');
        writeFileSync(reportFile, JSON.stringify(report, null, 2));

        return report;
    }

    async cleanup() {
        await this.pool.end();
    }

    async run() {
        try {
            this.log('🚀 Starting Comprehensive Setup for Relay Shadow DVM', 'info');
            this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');

            // Step 1: Basic checks
            await this.checkDatabaseConnection();
            const dataStats = await this.checkDataAvailability();

            // Step 2: Create analytics infrastructure
            await this.createAnalyticsTables();
            await this.installQueryFunctions();
            await this.createMaterializedViews();

            // Step 3: Test and optimize
            const functionTests = await this.testDVMFunctions();
            await this.optimizeDatabase();

            // Step 4: Generate demo-ready data
            const samples = await this.generateSampleData();
            const precomputed = await this.generatePrecomputedResponses();

            // Step 5: Final validation
            const readiness = await this.validateSystemReadiness();

            // Generate final report
            const report = await this.generateSetupReport();

            this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
            this.log('🎉 COMPREHENSIVE SETUP COMPLETE!', 'success');
            this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');

            // Summary
            this.log(`⏱️  Total Duration: ${Math.round(report.duration / 1000)}s`, 'info');
            this.log(`📊 Data Available: ${Object.entries(dataStats).map(([k, v]) => `${k}=${v.toLocaleString()}`).join(', ')}`, 'info');
            this.log(`🔧 Functions Tested: ${Object.entries(functionTests).map(([k, v]) => `${k}=${v}`).join(', ')}`, 'info');
            this.log(`✅ Readiness Checks: ${readiness.checks.length - readiness.failures} passed, ${readiness.failures} warnings`, 'info');
            this.log(`💾 Sample Scenarios: ${Object.keys(samples).length} threat levels prepared`, 'info');
            this.log(`⚡ Pre-computed Responses: ${Object.keys(precomputed).length} scenarios cached`, 'info');

            if (this.errors.length > 0) {
                this.log(`⚠️  ${this.errors.length} errors occurred during setup`, 'warning');
                for (const error of this.errors) {
                    this.log(`   • ${error.step}: ${error.error}`, 'warning');
                }
            }

            this.log('🚀 System is ready for hackathon demo!', 'success');
            this.log('   • Start DVM: npm start', 'info');
            this.log('   • Start Client: npm run client:dev', 'info');
            this.log('   • Test CLI: npm run test:recommend', 'info');

            return report;

        } catch (error) {
            this.log(`💥 Setup failed: ${error.message}`, 'error');
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new ComprehensiveSetup();

    setup.run()
        .then((report) => {
            console.log('\n📄 Setup report generated: setup-report.json');
            process.exit(report.summary.errors > 0 ? 1 : 0);
        })
        .catch((error) => {
            console.error('\n💥 Setup failed:', error.message);
            process.exit(1);
        });
}

export { ComprehensiveSetup };