-- Fast query functions for the DVM (FIXED VERSION)

-- 1. Get personalized relay recommendations for a user (FIXED VERSION)
CREATE OR REPLACE FUNCTION get_user_relay_recommendations(
    user_pubkey TEXT,
    threat_level TEXT DEFAULT 'medium',
    max_results INT DEFAULT 10,
    include_following_factor BOOLEAN DEFAULT true
) RETURNS TABLE(
    relay_url TEXT,
    overall_score NUMERIC,
    privacy_score NUMERIC,
    reliability_score NUMERIC,
    following_users_count BIGINT,
    total_influence_weight NUMERIC,
    reasoning TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_following AS (
        -- Get users that this user follows
        SELECT DISTINCT (tag->>1)::TEXT as followed_pubkey
        FROM events e,
             jsonb_array_elements(e.tags) as tag
        WHERE e.pubkey = user_pubkey 
          AND e.kind = 3
          AND tag->>0 = 'p'
          AND LENGTH(tag->>1) = 64  -- Valid pubkey length
        LIMIT 1000  -- Limit to avoid huge following lists
    ),
    following_relay_stats AS (
        -- Calculate stats for relays used by followed users
        SELECT 
            rpw.relay_url,
            COUNT(DISTINCT rpw.pubkey) as following_users_count,
            SUM(rpw.weighted_contribution) as total_influence_weight,
            AVG(rpw.publisher_influence) as avg_influence
        FROM user_following uf
        JOIN relay_publisher_weights rpw ON uf.followed_pubkey = rpw.pubkey
        GROUP BY rpw.relay_url
    ),
    scored_relays AS (
        SELECT 
            rr.url,
            rr.overall_score,
            rr.privacy_score,
            rr.reliability_score,
            rr.performance_score,
            rr.diversity_score,
            
            -- Following network factors
            COALESCE(frs.following_users_count, 0) as following_users_count,
            COALESCE(frs.total_influence_weight, 0.0) as total_influence_weight,
            
            -- Adjust score based on threat level
            CASE threat_level
                WHEN 'low' THEN rr.overall_score + (COALESCE(rr.performance_score, 0) * 0.2)
                WHEN 'medium' THEN rr.overall_score + (COALESCE(rr.privacy_score, 0) * 0.1)
                WHEN 'high' THEN (COALESCE(rr.privacy_score, 0) * 0.4) + (COALESCE(rr.reliability_score, 0) * 0.3) + (COALESCE(rr.performance_score, 0) * 0.3)
                WHEN 'nation-state' THEN (COALESCE(rr.privacy_score, 0) * 0.6) + (COALESCE(rr.reliability_score, 0) * 0.4)
                ELSE COALESCE(rr.overall_score, 0)
            END as threat_adjusted_score,
            
            -- Following network bonus (if enabled)
            CASE 
                WHEN include_following_factor AND frs.following_users_count > 0 THEN
                    LOG(frs.following_users_count + 1) * 0.5
                ELSE 0.0
            END as following_bonus
            
        FROM relay_recommendations rr
        LEFT JOIN following_relay_stats frs ON rr.url = frs.relay_url
        WHERE rr.current_status = true OR rr.current_status IS NULL  -- Include relays without status
          AND (
              CASE threat_level
                  WHEN 'low' THEN COALESCE(rr.reliability_score, 0) > 3.0
                  WHEN 'medium' THEN COALESCE(rr.privacy_score, 0) > 2.0 AND COALESCE(rr.reliability_score, 0) > 3.0  
                  WHEN 'high' THEN COALESCE(rr.privacy_score, 0) > 3.0 AND COALESCE(rr.reliability_score, 0) > 4.0
                  WHEN 'nation-state' THEN COALESCE(rr.privacy_score, 0) > 4.0 AND COALESCE(rr.reliability_score, 0) > 5.0
                  ELSE COALESCE(rr.reliability_score, 0) > 1.0
              END
          )
    )
    SELECT 
        sr.url,
        CAST(sr.threat_adjusted_score + sr.following_bonus AS NUMERIC(10,2)) as overall_score,
        CAST(COALESCE(sr.privacy_score, 0) AS NUMERIC(10,2)) as privacy_score,
        CAST(COALESCE(sr.reliability_score, 0) AS NUMERIC(10,2)) as reliability_score,
        sr.following_users_count,
        CAST(sr.total_influence_weight AS NUMERIC(10,2)) as total_influence_weight,
        
        -- Generate reasoning
        CASE 
            WHEN sr.following_users_count > 5 THEN 
                format('High quality relay used by %s of your followed users', sr.following_users_count)
            WHEN COALESCE(sr.privacy_score, 0) > 8.0 THEN 
                'Excellent privacy protections and transparency'
            WHEN COALESCE(sr.reliability_score, 0) > 8.0 AND COALESCE(sr.performance_score, 0) > 7.0 THEN 
                'Highly reliable with excellent performance'
            WHEN COALESCE(sr.diversity_score, 0) > 7.0 THEN 
                'Good network diversity with quality publishers'
            ELSE 
                'Solid overall performance across all metrics'
        END as reasoning
        
    FROM scored_relays sr
    ORDER BY (sr.threat_adjusted_score + sr.following_bonus) DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 2. Analyze user's current relay setup
CREATE OR REPLACE FUNCTION analyze_user_current_relays(
    user_pubkey TEXT,
    current_relays TEXT[] DEFAULT NULL
) RETURNS TABLE(
    analysis_type TEXT,
    metric TEXT,
    value TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- If no current relays provided, try to infer from user's events
    IF current_relays IS NULL THEN
        current_relays := ARRAY(
            SELECT DISTINCT er.relay_url
            FROM events e
            JOIN events_relays er ON e.id = er.event_id
            WHERE e.pubkey = user_pubkey
            ORDER BY er.seen_at DESC
            LIMIT 10
        );
    END IF;
    
    RETURN QUERY
    -- Coverage analysis
    WITH user_following AS (
        SELECT DISTINCT (tag->>1)::TEXT as followed_pubkey
        FROM events e,
             jsonb_array_elements(e.tags) as tag
        WHERE e.pubkey = user_pubkey 
          AND e.kind = 3
          AND tag->>0 = 'p'
        ORDER BY e.created_at DESC
        LIMIT 500
    ),
    coverage_stats AS (
        SELECT 
            COUNT(DISTINCT uf.followed_pubkey) as total_following,
            COUNT(DISTINCT CASE 
                WHEN rpw.relay_url = ANY(current_relays) THEN uf.followed_pubkey 
            END) as covered_following,
            COUNT(DISTINCT CASE 
                WHEN rpw.relay_url != ALL(current_relays) THEN uf.followed_pubkey 
            END) as uncovered_following
        FROM user_following uf
        LEFT JOIN relay_publisher_weights rpw ON uf.followed_pubkey = rpw.pubkey
    )
    SELECT 
        'coverage'::TEXT,
        'following_coverage'::TEXT,
        format('%s%% (%s/%s)', 
            CAST(covered_following * 100.0 / NULLIF(total_following, 0) AS NUMERIC(5,1)),
            covered_following, 
            total_following
        )::TEXT,
        CASE 
            WHEN covered_following * 100.0 / NULLIF(total_following, 0) < 50 THEN
                'Consider adding more relays to better connect with your network'
            WHEN covered_following * 100.0 / NULLIF(total_following, 0) < 80 THEN
                'Good coverage, but some followed users might be missed'
            ELSE
                'Excellent coverage of your followed users'
        END::TEXT
    FROM coverage_stats
    
    UNION ALL
    
    -- Quality analysis
    SELECT 
        'quality'::TEXT,
        'average_privacy_score'::TEXT,
        CAST(AVG(rqs.privacy_score) AS NUMERIC(5,2))::TEXT,
        CASE 
            WHEN AVG(rqs.privacy_score) < 4.0 THEN 'Consider adding more privacy-focused relays'
            WHEN AVG(rqs.privacy_score) < 6.0 THEN 'Moderate privacy protection'
            ELSE 'Good privacy-focused relay selection'
        END::TEXT
    FROM unnest(current_relays) ur(relay_url)
    JOIN relay_quality_scores rqs ON ur.relay_url = rqs.url
    
    UNION ALL
    
    SELECT 
        'quality'::TEXT,
        'average_reliability'::TEXT,
        CAST(AVG(rqs.reliability_score) AS NUMERIC(5,2))::TEXT,
        CASE 
            WHEN AVG(rqs.reliability_score) < 6.0 THEN 'Some relays may be unreliable'
            WHEN AVG(rqs.reliability_score) < 8.0 THEN 'Generally reliable relay selection'
            ELSE 'Excellent reliability across your relays'
        END::TEXT
    FROM unnest(current_relays) ur(relay_url)
    JOIN relay_quality_scores rqs ON ur.relay_url = rqs.url
    
    UNION ALL
    
    -- Diversity analysis
    SELECT 
        'diversity'::TEXT,
        'relay_count'::TEXT,
        array_length(current_relays, 1)::TEXT,
        CASE 
            WHEN array_length(current_relays, 1) < 3 THEN 'Add more relays for redundancy'
            WHEN array_length(current_relays, 1) < 5 THEN 'Good number of relays'
            WHEN array_length(current_relays, 1) > 10 THEN 'Consider reducing for better performance'
            ELSE 'Excellent relay diversity'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. Get discovery recommendations (relays with quality content user doesn't follow)
CREATE OR REPLACE FUNCTION get_discovery_relays(
    max_results INT DEFAULT 5
) RETURNS TABLE(
    relay_url TEXT,
    discovery_score NUMERIC,
    unique_quality_publishers BIGINT,
    avg_publisher_influence NUMERIC,
    reasoning TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH discovery_candidates AS (
        SELECT 
            rpw.relay_url,
            COUNT(DISTINCT rpw.pubkey) as unique_publishers,
            AVG(rpw.publisher_influence) as avg_influence
        FROM relay_publisher_weights rpw
        WHERE rpw.publisher_influence > 2.0  -- Only quality publishers
        GROUP BY rpw.relay_url
        HAVING COUNT(DISTINCT rpw.pubkey) >= 3  -- At least 3 quality publishers
    )
    SELECT 
        dc.relay_url,
        CAST(
            -- Score based on publisher quality and count
            (dc.avg_influence * 2.0) + 
            (LOG(dc.unique_publishers) * 1.5) +
            -- Bonus for overall relay quality
            (COALESCE(rr.overall_score, 0) * 0.3)
        AS NUMERIC(10,2)) as discovery_score,
        dc.unique_publishers as unique_quality_publishers,
        CAST(dc.avg_influence AS NUMERIC(5,2)) as avg_publisher_influence,
        
        CASE 
            WHEN dc.unique_publishers > 10 AND dc.avg_influence > 5.0 THEN
                format('Hidden gem: %s high-influence publishers', dc.unique_publishers)
            WHEN dc.avg_influence > 7.0 THEN
                'High-influence publishers worth discovering'
            WHEN dc.unique_publishers > 15 THEN
                'Large community of quality publishers to explore'
            ELSE
                'Quality publishers for content discovery'
        END as reasoning
        
    FROM discovery_candidates dc
    JOIN relay_recommendations rr ON dc.relay_url = rr.url
    WHERE rr.reliability_score > 6.0  -- Only reliable relays for discovery
    ORDER BY discovery_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 4. Get relay health monitoring data
CREATE OR REPLACE FUNCTION get_relay_health_summary()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_relays', COUNT(*),
        'healthy_relays', COUNT(*) FILTER (WHERE 
            current_status = true AND 
            uptime_percentage > 0.9 AND 
            avg_rtt_read < 1500
        ),
        'unhealthy_relays', COUNT(*) FILTER (WHERE 
            current_status = false OR 
            uptime_percentage < 0.8 OR 
            avg_rtt_read > 2000
        ),
        'average_uptime', CAST(AVG(uptime_percentage * 100) AS NUMERIC(5,2)),
        'average_latency', CAST(AVG(avg_rtt_read) AS NUMERIC(8,1))
    ) INTO result
    FROM relay_analytics;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Generate relay rotation strategy
CREATE OR REPLACE FUNCTION generate_relay_rotation_strategy(
    user_pubkey TEXT,
    current_relays TEXT[] DEFAULT ARRAY[]::TEXT[],
    rotation_hours INT DEFAULT 6
) RETURNS TABLE(
    time_slot TEXT,
    recommended_relays TEXT[],
    strategy_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH rotation_pools AS (
        -- Create different pools of relays for rotation
        SELECT 
            rr.url,
            rr.overall_score,
            rr.privacy_score,
            rr.performance_score,
            rr.reliability_score,
            CASE 
                WHEN rr.privacy_score > 8.0 THEN 'high_privacy'
                WHEN rr.performance_score > 8.0 THEN 'high_performance'  
                WHEN rr.reliability_score > 8.0 THEN 'high_reliability'
                ELSE 'balanced'
            END as pool_type,
            -- Assign to time slots based on characteristics
            CASE 
                WHEN rr.privacy_score > 8.0 THEN 1  -- Night hours (high privacy)
                WHEN rr.performance_score > 8.0 THEN 2  -- Day hours (high performance)
                WHEN rr.reliability_score > 8.0 THEN 3  -- Evening hours (high reliability)
                ELSE 0  -- Any time (balanced)
            END as preferred_slot
        FROM relay_recommendations rr
        WHERE rr.overall_score > 6.0
    )
    SELECT 
        slot.time_description,
        ARRAY(
            SELECT rp.url 
            FROM rotation_pools rp 
            WHERE rp.preferred_slot = slot.slot_id OR rp.preferred_slot = 0
            ORDER BY rp.overall_score DESC 
            LIMIT 4
        ) as recommended_relays,
        slot.strategy_reason
    FROM (
        VALUES 
            (1, '00:00-06:00 (Night)', 'High privacy focus for sensitive hours'),
            (2, '06:00-18:00 (Day)', 'High performance for active usage'),
            (3, '18:00-00:00 (Evening)', 'High reliability for consistent access')
    ) slot(slot_id, time_description, strategy_reason);
END;
$$ LANGUAGE plpgsql;

-- 6. Performance optimization: Create composite indexes
CREATE INDEX IF NOT EXISTS idx_events_pubkey_kind_created ON events(pubkey, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_relays_seen_at_desc ON events_relays(seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_relay_publisher_weights_composite ON relay_publisher_weights(relay_url, publisher_influence DESC);

-- 7. Utility function to refresh all analytics (run periodically)
CREATE OR REPLACE FUNCTION refresh_relay_analytics() RETURNS VOID AS $$
BEGIN
    -- Refresh materialized view
    REFRESH MATERIALIZED VIEW relay_recommendations;
    
    -- Update any cached statistics
    ANALYZE relay_analytics;
    ANALYZE publisher_influence;
    ANALYZE relay_publisher_weights;
    ANALYZE relay_quality_scores;
    
    RAISE NOTICE 'Relay analytics refreshed successfully';
END;
$$ LANGUAGE plpgsql;