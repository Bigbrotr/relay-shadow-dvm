import { Pool } from 'pg';
import config from '../dvm/config.js';

async function quickFixScores() {
    const pool = new Pool(config.database);

    try {
        console.log('🔧 Quick fix: Adding baseline privacy and reliability scores...');

        // Update relay_quality_scores with baseline scores
        await pool.query(`
            UPDATE relay_quality_scores 
            SET 
                privacy_score = CASE 
                    WHEN url IN (
                        SELECT DISTINCT relay_url 
                        FROM relay_metadata 
                        WHERE nip11_success = true 
                          AND (name IS NOT NULL OR description IS NOT NULL)
                    ) THEN 4.0
                    ELSE 2.0
                END,
                reliability_score = CASE 
                    WHEN performance_score >= 5.0 THEN 7.0
                    WHEN performance_score >= 3.0 THEN 5.0
                    ELSE 3.0
                END
            WHERE privacy_score = 0 OR reliability_score = 0
        `);

        console.log('✅ Updated baseline scores');

        // Refresh materialized view
        await pool.query('REFRESH MATERIALIZED VIEW relay_recommendations');
        console.log('✅ Refreshed recommendations view');

        // Check results
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN overall_score > 7.0 THEN 1 END) as high_quality,
                COUNT(CASE WHEN overall_score > 5.0 THEN 1 END) as decent,
                CAST(ROUND(AVG(overall_score)::numeric, 2) AS NUMERIC) as avg_score
            FROM relay_recommendations
        `);

        const stats = result.rows[0];
        console.log(`📊 Results: ${stats.total} total, ${stats.high_quality} high quality (>7.0), ${stats.decent} decent (>5.0)`);
        console.log(`📈 Average score: ${stats.avg_score}`);

        // Show top relays
        const topResult = await pool.query(`
            SELECT url, CAST(ROUND(overall_score::numeric, 2) AS NUMERIC) as score
            FROM relay_recommendations
            ORDER BY overall_score DESC
            LIMIT 5
        `);

        console.log('\n🏆 Top 5 Relays After Fix:');
        topResult.rows.forEach((row, i) => {
            const status = row.score > 7.0 ? '🟢' : row.score > 5.0 ? '🟡' : '🔴';
            console.log(`     ${i + 1}. ${status} ${row.url} (${row.score})`);
        });

    } catch (error) {
        console.error('❌ Quick fix failed:', error);
    } finally {
        await pool.end();
    }
}

quickFixScores().catch(console.error);