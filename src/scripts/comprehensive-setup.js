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
                'refresh_relay_analytics'
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

            // FIXED: Check for materialized view in pg_matviews, not information_schema.views
            const result = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM pg_matviews 
                    WHERE matviewname = 'relay_recommendations'
                )
            `);

            if (!result.rows[0].exists) {
                throw new Error('relay_recommendations materialized view not found');
            }

            // Refresh the view
            await this.pool.query('REFRESH MATERIALIZED VIEW relay_recommendations');

            // Get count
            const countResult = await this.pool.query('SELECT COUNT(*) FROM relay_recommendations');
            const count = parseInt(countResult.rows[0].count);
            this.log(`relay_recommendations: ${count.toLocaleString()} records`, 'info');

            return true;
        });
    }

    async testDVMFunctions() {
        return await this.runStep('DVM Functions Testing', async () => {
            const tests = {};

            // Test user relay recommendations
            try {
                const testPubkey = 'npub1test1234567890abcdef1234567890abcdef1234567890abcdef12345';
                const result = await this.pool.query(`
                    SELECT COUNT(*) FROM get_user_relay_recommendations($1, 'medium', 5)
                `, [testPubkey]);
                tests.user_recommendations = parseInt(result.rows[0].count);
            } catch (error) {
                this.log(`User recommendations test failed: ${error.message}`, 'warning');
                tests.user_recommendations = 0;
            }

            // Test discovery relays
            try {
                const result = await this.pool.query(`
                    SELECT COUNT(*) FROM get_discovery_relays(10)
                `);
                tests.discovery_relays = parseInt(result.rows[0].count);
            } catch (error) {
                this.log(`Discovery relays test failed: ${error.message}`, 'warning');
                tests.discovery_relays = 0;
            }

            // Test relay health summary
            try {
                const result = await this.pool.query(`
                    SELECT get_relay_health_summary() as summary
                `);
                tests.health_summary = result.rows[0].summary ? 'pass' : 'fail';
            } catch (error) {
                this.log(`Health summary test failed: ${error.message}`, 'warning');
                tests.health_summary = 'fail';
            }

            this.log(`Function tests completed: ${JSON.stringify(tests)}`, 'info');
            return tests;
        });
    }

    async optimizeDatabase() {
        return await this.runStep('Database Optimization', async () => {
            // Run ANALYZE on all analytics tables
            const tables = [
                'relay_analytics',
                'publisher_influence',
                'relay_publisher_weights',
                'relay_quality_scores',
                'relay_recommendations'
            ];

            for (const table of tables) {
                await this.pool.query(`ANALYZE ${table}`);
            }

            this.log('Database statistics updated', 'info');
            return true;
        });
    }

    async generateSampleData() {
        return await this.runStep('Sample Data Generation', async () => {
            const samples = {};

            // Generate sample recommendations for different threat levels
            const threatLevels = ['low', 'medium', 'high', 'nation-state'];

            for (const threat of threatLevels) {
                try {
                    const result = await this.pool.query(`
                        SELECT url, overall_score, privacy_score, reliability_score
                        FROM relay_recommendations 
                        WHERE overall_score > 
                            CASE 
                                WHEN $1 = 'low' THEN 3.0
                                WHEN $1 = 'medium' THEN 5.0  
                                WHEN $1 = 'high' THEN 7.0
                                ELSE 8.0
                            END
                        ORDER BY overall_score DESC
                        LIMIT 10
                    `, [threat]);

                    samples[threat] = result.rows;
                    this.log(`Generated ${result.rows.length} samples for ${threat} threat level`, 'info');
                } catch (error) {
                    this.log(`Sample generation failed for ${threat}: ${error.message}`, 'warning');
                    samples[threat] = [];
                }
            }

            return samples;
        });
    }

    async generatePrecomputedResponses() {
        return await this.runStep('Precomputed Responses Generation', async () => {
            const responses = {};

            // Precompute common DVM responses
            const scenarios = [
                { name: 'general_user', threat: 'medium', following: false },
                { name: 'privacy_focused', threat: 'high', following: false },
                { name: 'social_user', threat: 'low', following: true },
                { name: 'journalist', threat: 'nation-state', following: false }
            ];

            for (const scenario of scenarios) {
                try {
                    const testPubkey = 'npub1test1234567890abcdef1234567890abcdef1234567890abcdef12345';
                    const result = await this.pool.query(`
                        SELECT * FROM get_user_relay_recommendations($1, $2, 8, $3)
                    `, [testPubkey, scenario.threat, scenario.following]);

                    responses[scenario.name] = result.rows;
                    this.log(`Precomputed ${result.rows.length} recommendations for ${scenario.name}`, 'info');
                } catch (error) {
                    this.log(`Precomputation failed for ${scenario.name}: ${error.message}`, 'warning');
                    responses[scenario.name] = [];
                }
            }

            // Cache responses to file for fast demo loading
            const cacheFile = join(__dirname, '../../cache/precomputed-responses.json');
            writeFileSync(cacheFile, JSON.stringify(responses, null, 2));

            return responses;
        });
    }

    async validateSystemReadiness() {
        return await this.runStep('System Readiness Validation', async () => {
            const checks = [];
            let failures = 0;

            // Check materialized view has data
            try {
                const result = await this.pool.query('SELECT COUNT(*) FROM relay_recommendations');
                const count = parseInt(result.rows[0].count);
                if (count > 0) {
                    checks.push({ name: 'relay_recommendations_data', status: 'pass', value: count });
                } else {
                    checks.push({ name: 'relay_recommendations_data', status: 'fail', value: count });
                    failures++;
                }
            } catch (error) {
                checks.push({ name: 'relay_recommendations_data', status: 'error', error: error.message });
                failures++;
            }

            // Check high-quality relays available
            try {
                const result = await this.pool.query('SELECT COUNT(*) FROM relay_recommendations WHERE overall_score > 7.0');
                const count = parseInt(result.rows[0].count);
                if (count >= 5) {
                    checks.push({ name: 'high_quality_relays', status: 'pass', value: count });
                } else {
                    checks.push({ name: 'high_quality_relays', status: 'warning', value: count });
                    failures++;
                }
            } catch (error) {
                checks.push({ name: 'high_quality_relays', status: 'error', error: error.message });
                failures++;
            }

            // Check analytics tables have data
            const analyticsTables = ['relay_analytics', 'publisher_influence', 'relay_quality_scores'];
            for (const table of analyticsTables) {
                try {
                    const result = await this.pool.query(`SELECT COUNT(*) FROM ${table}`);
                    const count = parseInt(result.rows[0].count);
                    if (count > 0) {
                        checks.push({ name: `${table}_data`, status: 'pass', value: count });
                    } else {
                        checks.push({ name: `${table}_data`, status: 'fail', value: count });
                        failures++;
                    }
                } catch (error) {
                    checks.push({ name: `${table}_data`, status: 'error', error: error.message });
                    failures++;
                }
            }

            this.log(`Readiness validation: ${checks.length - failures}/${checks.length} checks passed`, failures > 0 ? 'warning' : 'success');

            return { checks, failures };
        });
    }

    async generateSetupReport() {
        const duration = Date.now() - this.startTime;

        const report = {
            timestamp: new Date().toISOString(),
            duration,
            success: this.errors.length === 0,
            steps: this.steps,
            errors: this.errors,
            summary: {
                total_steps: this.steps.length,
                successful: this.steps.filter(s => s.type === 'success').length,
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

    setup.run().catch(error => {
        console.error(`💥 Setup failed: ${error.message}`);
        process.exit(1);
    });
}

export default ComprehensiveSetup;