-- Pre-processing script to create analytics tables
-- Run this before the hackathon to have fast DVM responses

-- 1. Create relay analytics with comprehensive metrics
CREATE TABLE IF NOT EXISTS relay_analytics AS
SELECT 
    r.url,
    r.network,
    r.inserted_at,
    
    -- Event metrics
    COUNT(DISTINCT er.event_id) as total_events,
    COUNT(DISTINCT e.pubkey) as unique_publishers,
    COUNT(DISTINCT e.kind) as event_kind_diversity,
    
    -- Temporal analysis
    MIN(er.seen_at) as first_event_timestamp,
    MAX(er.seen_at) as last_event_timestamp,
    COUNT(DISTINCT DATE(to_timestamp(er.seen_at))) as active_days,
    
    -- Activity metrics
    COUNT(DISTINCT er.event_id) / NULLIF(
        GREATEST((MAX(er.seen_at) - MIN(er.seen_at)) / 86400.0, 1), 0
    ) as events_per_day,
    
    -- Recent activity (last 30 days)
    COUNT(DISTINCT CASE 
        WHEN er.seen_at > (EXTRACT(epoch FROM NOW()) - 2592000) 
        THEN er.event_id 
    END) as recent_events_30d,
    
    -- Performance metrics from metadata
    (
        SELECT AVG(rtt_read) 
        FROM relay_metadata rm 
        WHERE rm.relay_url = r.url AND rm.connection_success = true
    ) as avg_rtt_read,
    
    -- Reliability metrics
    (
        SELECT AVG(CASE WHEN connection_success THEN 1.0 ELSE 0.0 END)
        FROM relay_metadata rm 
        WHERE rm.relay_url = r.url
    ) as uptime_percentage,
    
    -- Latest metadata
    (
        SELECT connection_success
        FROM relay_metadata rm 
        WHERE rm.relay_url = r.url 
        ORDER BY generated_at DESC 
        LIMIT 1
    ) as current_status

FROM relays r
LEFT JOIN events_relays er ON r.url = er.relay_url
LEFT JOIN events e ON er.event_id = e.id
GROUP BY r.url, r.network, r.inserted_at;

-- 2. Create publisher influence scores
CREATE TABLE IF NOT EXISTS publisher_influence AS
WITH follower_counts AS (
    SELECT 
        e.pubkey,
        COUNT(DISTINCT following_events.pubkey) as follower_count,
        -- Count who this pubkey follows
        (
            SELECT COUNT(*)
            FROM jsonb_array_elements(latest_follows.tags) tag
            WHERE tag->>0 = 'p'
        ) as following_count
    FROM events e
    -- Find users who follow this pubkey (kind 3 contact lists)
    LEFT JOIN events following_events ON (
        following_events.kind = 3 AND 
        EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(following_events.tags) tag
            WHERE tag->>0 = 'p' AND tag->>1 = e.pubkey
        )
    )
    -- Get latest contact list for following count
    LEFT JOIN LATERAL (
        SELECT tags
        FROM events follows
        WHERE follows.pubkey = e.pubkey AND follows.kind = 3
        ORDER BY created_at DESC
        LIMIT 1
    ) latest_follows ON true
    WHERE e.kind = 0  -- Only count profile events (to get unique pubkeys)
    GROUP BY e.pubkey, latest_follows.tags
)
SELECT 
    pubkey,
    follower_count,
    following_count,
    -- Influence score: log scale to prevent extreme values
    CASE 
        WHEN follower_count > 0 THEN 1.0 + LOG(follower_count) * 2.0
        ELSE 1.0 
    END as influence_score,
    -- Activity score based on event count
    (
        SELECT COUNT(*) * 0.01
        FROM events e2 
        WHERE e2.pubkey = follower_counts.pubkey
    ) as activity_score
FROM follower_counts;

-- 3. Create relay-publisher relationship weights
CREATE TABLE IF NOT EXISTS relay_publisher_weights AS
SELECT 
    er.relay_url,
    e.pubkey,
    COUNT(DISTINCT er.event_id) as event_count,
    COALESCE(pi.influence_score, 1.0) as publisher_influence,
    COALESCE(pi.activity_score, 0.1) as publisher_activity,
    -- Combined weight: events * influence * recency factor
    COUNT(DISTINCT er.event_id) * 
    COALESCE(pi.influence_score, 1.0) * 
    -- Recency boost for recent events
    (1.0 + AVG(
        CASE 
            WHEN er.seen_at > (EXTRACT(epoch FROM NOW()) - 604800) THEN 0.5  -- Last week
            WHEN er.seen_at > (EXTRACT(epoch FROM NOW()) - 2592000) THEN 0.2  -- Last month
            ELSE 0.0 
        END
    )) as weighted_contribution

FROM events_relays er
JOIN events e ON er.event_id = e.id
LEFT JOIN publisher_influence pi ON e.pubkey = pi.pubkey
GROUP BY er.relay_url, e.pubkey, pi.influence_score, pi.activity_score;

-- 4. Create comprehensive relay quality scores
CREATE TABLE IF NOT EXISTS relay_quality_scores AS
SELECT 
    ra.url,
    
    -- Privacy & transparency score
    (
        SELECT 
            CASE 
                WHEN privacy_policy IS NOT NULL AND terms_of_service IS NOT NULL THEN 8.0
                WHEN privacy_policy IS NOT NULL OR terms_of_service IS NOT NULL THEN 5.0
                WHEN name IS NOT NULL AND description IS NOT NULL THEN 3.0
                ELSE 1.0
            END +
            -- Bonus for no auth requirements
            CASE 
                WHEN limitation->>'auth_required' = 'false' OR limitation->>'auth_required' IS NULL THEN 2.0
                ELSE 0.0
            END
        FROM relay_metadata rm 
        WHERE rm.relay_url = ra.url AND rm.nip11_success = true
        ORDER BY generated_at DESC 
        LIMIT 1
    ) as privacy_score,
    
    -- Network diversity score (unique publishers)
    LEAST(LOG(ra.unique_publishers + 1) * 2.0, 10.0) as diversity_score,
    
    -- Reliability score
    COALESCE(ra.uptime_percentage * 10.0, 0.0) as reliability_score,
    
    -- Performance score (lower latency = higher score)
    CASE 
        WHEN ra.avg_rtt_read > 0 AND ra.avg_rtt_read < 2000 THEN 
            10.0 - (ra.avg_rtt_read / 200.0)
        WHEN ra.avg_rtt_read IS NULL THEN 5.0  -- Unknown performance
        ELSE 1.0  -- Poor performance
    END as performance_score,
    
    -- Activity health score (not too little, not too much)
    CASE 
        WHEN ra.events_per_day BETWEEN 5 AND 500 THEN 10.0
        WHEN ra.events_per_day BETWEEN 1 AND 1000 THEN 
            8.0 - ABS(LOG(ra.events_per_day) - LOG(50)) * 0.5
        WHEN ra.events_per_day > 0 THEN 3.0
        ELSE 0.0
    END as activity_score,
    
    -- Publisher quality score (average influence of publishers)
    COALESCE(
        (
            SELECT AVG(publisher_influence) 
            FROM relay_publisher_weights rpw 
            WHERE rpw.relay_url = ra.url
        ), 
        1.0
    ) as publisher_quality_score,
    
    -- Recent activity bonus
    CASE 
        WHEN ra.recent_events_30d > 0 THEN 2.0
        ELSE 0.0
    END as recency_bonus

FROM relay_analytics ra;

-- 5. Create indexes for fast DVM queries
CREATE INDEX IF NOT EXISTS idx_relay_analytics_url ON relay_analytics(url);
CREATE INDEX IF NOT EXISTS idx_publisher_influence_pubkey ON publisher_influence(pubkey);
CREATE INDEX IF NOT EXISTS idx_relay_publisher_weights_relay ON relay_publisher_weights(relay_url);
CREATE INDEX IF NOT EXISTS idx_relay_publisher_weights_pubkey ON relay_publisher_weights(pubkey);
CREATE INDEX IF NOT EXISTS idx_relay_quality_scores_url ON relay_quality_scores(url);

-- 6. Create a materialized view for quick user-relay recommendations
CREATE MATERIALIZED VIEW IF NOT EXISTS relay_recommendations AS
SELECT 
    rqs.url,
    -- Overall quality score (weighted average)
    (
        COALESCE(rqs.privacy_score, 0) * 0.25 +
        COALESCE(rqs.reliability_score, 0) * 0.20 +
        COALESCE(rqs.performance_score, 0) * 0.15 +
        COALESCE(rqs.diversity_score, 0) * 0.15 +
        COALESCE(rqs.activity_score, 0) * 0.15 +
        COALESCE(rqs.publisher_quality_score, 0) * 0.10
    ) + COALESCE(rqs.recency_bonus, 0) as overall_score,
    
    -- Individual component scores
    rqs.privacy_score,
    rqs.reliability_score,
    rqs.performance_score,
    rqs.diversity_score,
    rqs.activity_score,
    rqs.publisher_quality_score,
    
    -- Relay stats
    ra.total_events,
    ra.unique_publishers,
    ra.events_per_day,
    ra.uptime_percentage,
    ra.avg_rtt_read,
    ra.current_status,
    
    -- Network classification
    CASE 
        WHEN ra.unique_publishers < 10 THEN 'niche'
        WHEN ra.unique_publishers < 100 THEN 'medium'
        ELSE 'large'
    END as relay_size

FROM relay_quality_scores rqs
JOIN relay_analytics ra ON rqs.url = ra.url
WHERE ra.current_status = true  -- Only include currently working relays
ORDER BY overall_score DESC;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW relay_recommendations;