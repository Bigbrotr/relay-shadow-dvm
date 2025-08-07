#!/usr/bin/env node

// Data Analysis and Debug Script
// Helps diagnose why there are 0 high-quality relays

import { Pool } from 'pg';
import config from '../dvm/config.js';

class DataAnalysis {
    constructor() {
        this.pool = new Pool(config.database);
    }

    async analyzeData() {
        console.log('🔍 Analyzing BigBrotr dataset for DVM readiness...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            // Check basic data availability
            await this.checkBasicData();

            // Check relay analytics
            await this.checkRelayAnalytics();

            // Check relay quality scores
            await this.checkRelayQuality();

            // Check materialized view
            await this.checkMaterializedView();

            // Suggest fixes
            await this.suggestFixes();

        } catch (error) {
            console.error('❌ Analysis failed:', error);
        }
    }

    async checkBasicData() {
        console.log('\n📊 Basic Data Check:');

        const queries = [
            { name: 'Events', query: 'SELECT COUNT(*) FROM events', minExpected: 1000 },
            { name: 'Relays', query: 'SELECT COUNT(*) FROM relays', minExpected: 10 },
            { name: 'Events-Relays', query: 'SELECT COUNT(*) FROM events_relays', minExpected: 1000 },
            { name: 'Relay Metadata', query: 'SELECT COUNT(*) FROM relay_metadata', minExpected: 10 }
        ];

        for (const { name, query, minExpected } of queries) {
            try {
                const result = await this.pool.query(query);
                const count = parseInt(result.rows[0].count);
                const status = count >= minExpected ? '✅' : '⚠️';
                console.log(`  ${status} ${name}: ${count.toLocaleString()} (min: ${minExpected})`);

                if (name === 'Relays' && count > 0) {
                    // Show sample relays
                    const sampleResult = await this.pool.query('SELECT url FROM relays LIMIT 5');
                    console.log(`      Sample relays: ${sampleResult.rows.map(r => r.url).join(', ')}`);
                }
            } catch (error) {
                console.log(`  ❌ ${name}: Error - ${error.message}`);
            }
        }
    }

    async checkRelayAnalytics() {
        console.log('\n🔬 Relay Analytics Check:');

        try {
            // Check if analytics tables exist
            const tables = ['relay_analytics', 'publisher_influence', 'relay_publisher_weights', 'relay_quality_scores'];

            for (const table of tables) {
                const existsResult = await this.pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [table]);

                if (existsResult.rows[0].exists) {
                    const countResult = await this.pool.query(`SELECT COUNT(*) FROM ${table}`);
                    const count = parseInt(countResult.rows[0].count);
                    console.log(`  ✅ ${table}: ${count.toLocaleString()} records`);

                    if (count === 0) {
                        console.log(`  ⚠️  ${table} is empty - analytics may need to be rebuilt`);
                    }
                } else {
                    console.log(`  ❌ ${table}: Table does not exist`);
                }
            }

            // Check relay analytics quality
            const analyticsResult = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_relays,
                    COUNT(CASE WHEN total_events > 0 THEN 1 END) as active_relays,
                    COUNT(CASE WHEN unique_publishers >= 5 THEN 1 END) as diverse_relays,
                    AVG(total_events) as avg_events,
                    AVG(unique_publishers) as avg_publishers
                FROM relay_analytics
            `);

            if (analyticsResult.rows.length > 0) {
                const stats = analyticsResult.rows[0];
                console.log(`  📈 Analytics Summary:`);
                console.log(`     Total relays: ${stats.total_relays}`);
                console.log(`     Active relays: ${stats.active_relays}`);
                console.log(`     Diverse relays (5+ publishers): ${stats.diverse_relays}`);
                console.log(`     Avg events per relay: ${Math.round(parseFloat(stats.avg_events) || 0)}`);
                console.log(`     Avg publishers per relay: ${Math.round(parseFloat(stats.avg_publishers) || 0)}`);
            }

        } catch (error) {
            console.log(`  ❌ Analytics check failed: ${error.message}`);
        }
    }

    async checkRelayQuality() {
        console.log('\n🏆 Relay Quality Analysis:');

        try {
            const qualityResult = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN privacy_score > 0 THEN 1 END) as with_privacy,
                    COUNT(CASE WHEN reliability_score > 0 THEN 1 END) as with_reliability,
                    COUNT(CASE WHEN performance_score > 0 THEN 1 END) as with_performance,
                    AVG(privacy_score) as avg_privacy,
                    AVG(reliability_score) as avg_reliability,
                    AVG(performance_score) as avg_performance
                FROM relay_quality_scores
            `);

            if (qualityResult.rows.length > 0) {
                const stats = qualityResult.rows[0];
                console.log(`  📊 Quality Score Distribution:`);
                console.log(`     Total scored relays: ${stats.total}`);
                console.log(`     With privacy score: ${stats.with_privacy}`);
                console.log(`     With reliability score: ${stats.with_reliability}`);
                console.log(`     With performance score: ${stats.with_performance}`);
                console.log(`     Avg privacy: ${parseFloat(stats.avg_privacy || 0).toFixed(2)}`);
                console.log(`     Avg reliability: ${parseFloat(stats.avg_reliability || 0).toFixed(2)}`);
                console.log(`     Avg performance: ${parseFloat(stats.avg_performance || 0).toFixed(2)}`);
            }

            // Check score distribution
            const distributionResult = await this.pool.query(`
                SELECT 
                    CASE 
                        WHEN privacy_score >= 8 THEN 'Excellent (8+)'
                        WHEN privacy_score >= 6 THEN 'Good (6-8)'
                        WHEN privacy_score >= 4 THEN 'Fair (4-6)'
                        WHEN privacy_score > 0 THEN 'Poor (0-4)'
                        ELSE 'No Score'
                    END as privacy_category,
                    COUNT(*) as count
                FROM relay_quality_scores
                GROUP BY 
                    CASE 
                        WHEN privacy_score >= 8 THEN 'Excellent (8+)'
                        WHEN privacy_score >= 6 THEN 'Good (6-8)'
                        WHEN privacy_score >= 4 THEN 'Fair (4-6)'
                        WHEN privacy_score > 0 THEN 'Poor (0-4)'
                        ELSE 'No Score'
                    END
                ORDER BY count DESC
            `);

            console.log(`  🎯 Privacy Score Distribution:`);
            distributionResult.rows.forEach(row => {
                console.log(`     ${row.privacy_category}: ${row.count}`);
            });

        } catch (error) {
            console.log(`  ❌ Quality analysis failed: ${error.message}`);
        }
    }

    async checkMaterializedView() {
        console.log('\n🔍 Materialized View Check:');

        try {
            // Check if materialized view exists
            const viewExistsResult = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM pg_matviews 
                    WHERE matviewname = 'relay_recommendations'
                )
            `);

            if (!viewExistsResult.rows[0].exists) {
                console.log(`  ❌ relay_recommendations materialized view does not exist`);
                return;
            }

            console.log(`  ✅ relay_recommendations view exists`);

            // Check view contents
            const viewStatsResult = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN overall_score > 7.0 THEN 1 END) as high_quality,
                    COUNT(CASE WHEN overall_score > 5.0 THEN 1 END) as decent_quality,
                    COUNT(CASE WHEN current_status = true THEN 1 END) as active,
                    MIN(overall_score) as min_score,
                    MAX(overall_score) as max_score,
                    AVG(overall_score) as avg_score
                FROM relay_recommendations
            `);

            if (viewStatsResult.rows.length > 0) {
                const stats = viewStatsResult.rows[0];
                console.log(`  📈 Recommendations Summary:`);
                console.log(`     Total recommendations: ${stats.total}`);
                console.log(`     High quality (>7.0): ${stats.high_quality}`);
                console.log(`     Decent quality (>5.0): ${stats.decent_quality}`);
                console.log(`     Currently active: ${stats.active}`);
                console.log(`     Score range: ${parseFloat(stats.min_score || 0).toFixed(2)} - ${parseFloat(stats.max_score || 0).toFixed(2)}`);
                console.log(`     Average score: ${parseFloat(stats.avg_score || 0).toFixed(2)}`);
            }

            // Show top relays
            const topResult = await this.pool.query(`
                SELECT url, overall_score, privacy_score, reliability_score, current_status
                FROM relay_recommendations 
                ORDER BY overall_score DESC 
                LIMIT 10
            `);

            console.log(`  🏆 Top 10 Relays:`);
            topResult.rows.forEach((row, i) => {
                const status = row.current_status ? '🟢' : '🔴';
                console.log(`     ${i + 1}. ${status} ${row.url} (${parseFloat(row.overall_score).toFixed(2)})`);
            });

        } catch (error) {
            console.log(`  ❌ View check failed: ${error.message}`);
        }
    }

    async suggestFixes() {
        console.log('\n💡 Suggested Fixes:');

        try {
            // Check if we have recent events
            const recentEventsResult = await this.pool.query(`
                SELECT COUNT(*) 
                FROM events 
                WHERE created_at > $1
            `, [Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)]); // Last 30 days

            const recentEvents = parseInt(recentEventsResult.rows[0].count);

            if (recentEvents < 100) {
                console.log(`  ⚠️  Only ${recentEvents} events in last 30 days - data may be stale`);
                console.log(`     • Check if BigBrotr is actively collecting data`);
                console.log(`     • Consider using test data or sample dataset`);
            }

            // Check if metadata exists
            const metadataResult = await this.pool.query(`
                SELECT COUNT(*) 
                FROM relay_metadata 
                WHERE connection_success = true
            `);

            const workingMetadata = parseInt(metadataResult.rows[0].count);

            if (workingMetadata === 0) {
                console.log(`  ⚠️  No successful relay metadata - privacy scores will be low`);
                console.log(`     • Run relay metadata collection`);
                console.log(`     • Check relay connectivity`);
            }

            // Rebuild suggestions
            console.log(`  🔧 Try these commands to fix data issues:`);
            console.log(`     1. Refresh analytics: npm run comprehensive-setup`);
            console.log(`     2. Rebuild with lower thresholds:`);
            console.log(`        node -e "import('./src/scripts/rebuild-with-lower-thresholds.js')"`);
            console.log(`     3. Generate sample data:`);
            console.log(`        node -e "import('./src/scripts/generate-sample-data.js')"`);

        } catch (error) {
            console.log(`  ❌ Fix suggestion failed: ${error.message}`);
        }
    }

    async cleanup() {
        await this.pool.end();
    }
}

// Quick rebuild with lower thresholds
async function rebuildWithLowerThresholds() {
    const pool = new Pool(config.database);

    try {
        console.log('🔧 Rebuilding with lower quality thresholds...');

        // Drop and recreate materialized view with lower thresholds
        await pool.query(`
            DROP MATERIALIZED VIEW IF EXISTS relay_recommendations;
            
            CREATE MATERIALIZED VIEW relay_recommendations AS
            SELECT 
                rqs.url,
                -- Overall quality score (weighted average) with lower minimum
                GREATEST(
                    (
                        COALESCE(rqs.privacy_score, 0) * 0.25 +
                        COALESCE(rqs.reliability_score, 0) * 0.20 +
                        COALESCE(rqs.performance_score, 0) * 0.15 +
                        COALESCE(rqs.diversity_score, 0) * 0.15 +
                        COALESCE(rqs.activity_score, 0) * 0.15 +
                        COALESCE(rqs.publisher_quality_score, 0) * 0.10
                    ) + COALESCE(rqs.recency_bonus, 0),
                    1.0  -- Minimum score of 1.0 instead of requiring current_status = true
                ) as overall_score,
                
                -- Individual component scores
                COALESCE(rqs.privacy_score, 1.0) as privacy_score,
                COALESCE(rqs.reliability_score, 1.0) as reliability_score, 
                COALESCE(rqs.performance_score, 1.0) as performance_score,
                COALESCE(rqs.diversity_score, 1.0) as diversity_score,
                COALESCE(rqs.activity_score, 1.0) as activity_score,
                COALESCE(rqs.publisher_quality_score, 1.0) as publisher_quality_score,
                
                -- Relay stats
                ra.total_events,
                ra.unique_publishers,
                ra.events_per_day,
                COALESCE(ra.uptime_percentage, 0.5) as uptime_percentage,
                ra.avg_rtt_read,
                COALESCE(ra.current_status, true) as current_status,
                
                -- Network classification
                CASE 
                    WHEN ra.unique_publishers < 3 THEN 'niche'
                    WHEN ra.unique_publishers < 20 THEN 'medium'
                    ELSE 'large'
                END as relay_size

            FROM relay_quality_scores rqs
            JOIN relay_analytics ra ON rqs.url = ra.url
            ORDER BY overall_score DESC;
        `);

        console.log('✅ Rebuilt with lower thresholds');

        // Check results
        const result = await pool.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN overall_score > 5.0 THEN 1 END) as decent
            FROM relay_recommendations
        `);

        console.log(`📊 Results: ${result.rows[0].total} total, ${result.rows[0].decent} with decent scores`);

    } catch (error) {
        console.error('❌ Rebuild failed:', error);
    } finally {
        await pool.end();
    }
}

// Run analysis
if (import.meta.url === `file://${process.argv[1]}`) {
    const analysis = new DataAnalysis();

    const args = process.argv.slice(2);

    if (args.includes('--rebuild')) {
        rebuildWithLowerThresholds().catch(console.error);
    } else {
        analysis.analyzeData()
            .then(() => {
                console.log('\n✅ Analysis complete!');
                console.log('💡 Run with --rebuild to fix low quality scores');
            })
            .catch(console.error)
            .finally(() => analysis.cleanup());
    }
}

export { DataAnalysis };