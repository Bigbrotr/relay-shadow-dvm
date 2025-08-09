import { Pool } from 'pg';
import config from '../config/config.js';

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

        // Create indexes on the materialized view for faster queries
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_relay_recommendations_overall_score 
                ON relay_recommendations(overall_score DESC);
            CREATE INDEX IF NOT EXISTS idx_relay_recommendations_privacy_score 
                ON relay_recommendations(privacy_score DESC);
            CREATE INDEX IF NOT EXISTS idx_relay_recommendations_reliability_score 
                ON relay_recommendations(reliability_score DESC);
            CREATE INDEX IF NOT EXISTS idx_relay_recommendations_current_status 
                ON relay_recommendations(current_status);
            CREATE INDEX IF NOT EXISTS idx_relay_recommendations_url 
                ON relay_recommendations(url);
        `);

        console.log('✅ Rebuilt with lower thresholds');

        // Check results
        const result = await pool.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN overall_score > 5.0 THEN 1 END) as decent,
                   COUNT(CASE WHEN overall_score > 7.0 THEN 1 END) as high_quality,
                   ROUND(AVG(overall_score), 2) as avg_score
            FROM relay_recommendations
        `);

        const stats = result.rows[0];
        console.log(`📊 Results: ${stats.total} total, ${stats.decent} decent (>5.0), ${stats.high_quality} high quality (>7.0)`);
        console.log(`📈 Average score: ${stats.avg_score}`);

        // Show top 10 improved relays
        const topResult = await pool.query(`
            SELECT url, ROUND(overall_score, 2) as score
            FROM relay_recommendations
            ORDER BY overall_score DESC
            LIMIT 10
        `);

        console.log('\n🏆 Top 10 Relays After Rebuild:');
        topResult.rows.forEach((row, i) => {
            const status = row.score > 7.0 ? '🟢' : row.score > 5.0 ? '🟡' : '🔴';
            console.log(`     ${i + 1}. ${status} ${row.url} (${row.score})`);
        });

    } catch (error) {
        console.error('❌ Rebuild failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    rebuildWithLowerThresholds().catch(console.error);
}

export default rebuildWithLowerThresholds;