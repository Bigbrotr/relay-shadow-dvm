// Relay Shadow DVM - Privacy-Focused Relay Recommendation Service
// Built for Bitcoin++ Privacy Hackathon 2025

import { Pool } from 'pg';
import { RelayPool } from 'nostr-relaypool';
import { generatePrivateKey, getPublicKey, finishEvent, validateEvent } from 'nostr-tools';

class RelayShadowDVM {
    constructor(config) {
        this.db = new Pool(config.database);
        this.relayPool = new RelayPool();
        this.privateKey = config.privateKey || generatePrivateKey();
        this.publicKey = getPublicKey(this.privateKey);
        this.dvmRelays = config.dvmRelays || ['wss://relay.damus.io', 'wss://relay.snort.social'];

        // DVM Configuration
        this.dvmKind = 5600; // DVM request kind
        this.dvmResponseKind = 6600; // DVM response kind
        this.dvmJobRequestKind = 68001; // Custom job request kind for relay recommendations

        console.log(`🔮 Relay Shadow DVM initialized`);
        console.log(`📡 Public Key: ${this.publicKey}`);
        console.log(`🌐 Monitoring relays: ${this.dvmRelays.join(', ')}`);
    }

    async start() {
        // Connect to relays
        for (const relay of this.dvmRelays) {
            await this.relayPool.addRelay(relay);
        }

        // Subscribe to DVM requests
        this.relayPool.subscribe([
            {
                kinds: [this.dvmKind],
                '#p': [this.publicKey], // Requests mentioning our DVM
                since: Math.floor(Date.now() / 1000) - 3600 // Last hour
            }
        ], this.dvmRelays, (event) => {
            this.handleDVMRequest(event);
        });

        console.log('✅ Relay Shadow DVM is now listening for requests...');
    }

    async handleDVMRequest(event) {
        try {
            console.log(`📨 Received DVM request from ${event.pubkey}`);

            // Validate the request
            if (!validateEvent(event)) {
                console.log('❌ Invalid event received');
                return;
            }

            // Parse request parameters
            const request = this.parseRequest(event);
            console.log(`🔍 Request type: ${request.type}, User: ${request.userPubkey}`);

            // Process the request
            let response;
            switch (request.type) {
                case 'recommend':
                    response = await this.generateRecommendations(request);
                    break;
                case 'analyze':
                    response = await this.analyzeCurrentSetup(request);
                    break;
                case 'discover':
                    response = await this.generateDiscoveryRecommendations(request);
                    break;
                case 'health':
                    response = await this.getRelayHealthSummary(request);
                    break;
                default:
                    response = await this.generateRecommendations(request);
            }

            // Send response
            await this.sendResponse(event, response);

        } catch (error) {
            console.error('❌ Error handling DVM request:', error);
            await this.sendErrorResponse(event, error.message);
        }
    }

    parseRequest(event) {
        const request = {
            userPubkey: event.pubkey,
            type: 'recommend',
            threatLevel: 'medium',
            useCase: 'social',
            currentRelays: [],
            preferences: {}
        };

        // Parse tags for parameters
        for (const tag of event.tags) {
            switch (tag[0]) {
                case 'param':
                    if (tag[1] === 'threat_level') request.threatLevel = tag[2];
                    if (tag[1] === 'use_case') request.useCase = tag[2];
                    if (tag[1] === 'request_type') request.type = tag[2];
                    if (tag[1] === 'current_relays') request.currentRelays = tag[2].split(',');
                    if (tag[1] === 'max_results') request.maxResults = parseInt(tag[2]) || 10;
                    break;
                case 'relay':
                    request.currentRelays.push(tag[1]);
                    break;
            }
        }

        // Try to parse JSON content for additional parameters
        try {
            const contentParams = JSON.parse(event.content);
            Object.assign(request, contentParams);
        } catch (e) {
            // Content is not JSON, treat as simple text request
            request.query = event.content;
        }

        return request;
    }

    async generateRecommendations(request) {
        const { userPubkey, threatLevel, maxResults = 10 } = request;

        console.log(`🎯 Generating recommendations for threat level: ${threatLevel}`);

        const query = `
            SELECT * FROM get_user_relay_recommendations($1, $2, $3, true)
        `;

        const result = await this.db.query(query, [userPubkey, threatLevel, maxResults]);

        const recommendations = result.rows.map(row => ({
            url: row.relay_url,
            scores: {
                overall: parseFloat(row.overall_score),
                privacy: parseFloat(row.privacy_score),
                reliability: parseFloat(row.reliability_score)
            },
            network: {
                followingUsersHere: parseInt(row.following_users_count),
                totalInfluenceWeight: parseFloat(row.total_influence_weight)
            },
            reasoning: row.reasoning
        }));

        // Get additional analytics
        const coverageAnalysis = await this.analyzeUserCoverage(userPubkey, request.currentRelays);

        return {
            type: 'relay_recommendations',
            recommendations: {
                primary: recommendations.slice(0, Math.min(5, recommendations.length)),
                backup: recommendations.slice(5, Math.min(8, recommendations.length)),
                discovery: recommendations.slice(8)
            },
            analysis: {
                threatLevel,
                currentRelayCoverage: coverageAnalysis.coverage,
                suggestions: coverageAnalysis.suggestions
            },
            metadata: {
                generated_at: Date.now(),
                total_relays_analyzed: await this.getTotalRelayCount(),
                algorithm_version: '1.0'
            }
        };
    }

    async analyzeCurrentSetup(request) {
        const { userPubkey, currentRelays = [] } = request;

        console.log(`📊 Analyzing current setup for ${currentRelays.length} relays`);

        const query = `
            SELECT * FROM analyze_user_current_relays($1, $2)
        `;

        const result = await this.db.query(query, [userPubkey, currentRelays]);

        const analysis = {
            type: 'relay_analysis',
            current_setup: {
                relay_count: currentRelays.length,
                relays: currentRelays
            },
            metrics: {},
            recommendations: []
        };

        // Group results by analysis type
        for (const row of result.rows) {
            if (!analysis.metrics[row.analysis_type]) {
                analysis.metrics[row.analysis_type] = {};
            }
            analysis.metrics[row.analysis_type][row.metric] = {
                value: row.value,
                recommendation: row.recommendation
            };
        }

        return analysis;
    }

    async generateDiscoveryRecommendations(request) {
        const { userPubkey, currentRelays = [], maxResults = 5 } = request;

        console.log(`🔭 Generating discovery recommendations`);

        const query = `
            SELECT * FROM get_discovery_relays($1, $2, $3)
        `;

        const result = await this.db.query(query, [userPubkey, currentRelays, maxResults]);

        const discoveries = result.rows.map(row => ({
            url: row.relay_url,
            discoveryScore: parseFloat(row.discovery_score),
            uniquePublishers: parseInt(row.unique_quality_publishers),
            avgInfluence: parseFloat(row.avg_publisher_influence),
            reasoning: row.reasoning
        }));

        return {
            type: 'discovery_recommendations',
            discoveries,
            summary: `Found ${discoveries.length} relays with quality content you might enjoy`
        };
    }

    async getRelayHealthSummary(request) {
        console.log(`🏥 Generating relay health summary`);

        const query = `
            SELECT * FROM get_relay_health_summary()
            LIMIT 50
        `;

        const result = await this.db.query(query);

        const healthSummary = result.rows.map(row => ({
            url: row.relay_url,
            status: row.health_status,
            uptime: parseFloat(row.uptime_7d),
            latency: parseInt(row.avg_latency_ms),
            recentActivity: parseInt(row.recent_events_24h),
            issues: row.issues
        }));

        // Categorize relays
        const categorized = {
            healthy: healthSummary.filter(r => r.status === 'HEALTHY'),
            unstable: healthSummary.filter(r => r.status === 'UNSTABLE'),
            down: healthSummary.filter(r => r.status === 'DOWN'),
            slow: healthSummary.filter(r => r.status === 'SLOW'),
            inactive: healthSummary.filter(r => r.status === 'INACTIVE')
        };

        return {
            type: 'relay_health_summary',
            summary: {
                total: healthSummary.length,
                healthy: categorized.healthy.length,
                issues: healthSummary.length - categorized.healthy.length
            },
            categories: categorized,
            timestamp: Date.now()
        };
    }

    async analyzeUserCoverage(userPubkey, currentRelays) {
        // Get user's following network coverage
        const coverageQuery = `
            WITH user_following AS (
                SELECT DISTINCT (tag->>1)::TEXT as followed_pubkey
                FROM events e, jsonb_array_elements(e.tags) as tag
                WHERE e.pubkey = $1 AND e.kind = 3 AND tag->>0 = 'p'
                ORDER BY e.created_at DESC LIMIT 500
            )
            SELECT 
                COUNT(DISTINCT uf.followed_pubkey) as total_following,
                COUNT(DISTINCT CASE WHEN rpw.relay_url = ANY($2) THEN uf.followed_pubkey END) as covered_following
            FROM user_following uf
            LEFT JOIN relay_publisher_weights rpw ON uf.followed_pubkey = rpw.pubkey
        `;

        const result = await this.db.query(coverageQuery, [userPubkey, currentRelays]);
        const { total_following, covered_following } = result.rows[0];

        const coveragePercent = total_following > 0 ?
            Math.round((covered_following / total_following) * 100) : 0;

        return {
            coverage: `${coveragePercent}% (${covered_following}/${total_following})`,
            suggestions: [
                coveragePercent < 50 ? "Add more relays to better connect with your network" :
                    coveragePercent < 80 ? "Good coverage, consider adding 1-2 more relays" :
                        "Excellent coverage of your followed users"
            ]
        };
    }

    async getTotalRelayCount() {
        const result = await this.db.query('SELECT COUNT(*) FROM relays WHERE url IN (SELECT url FROM relay_recommendations)');
        return parseInt(result.rows[0].count);
    }

    async sendResponse(originalEvent, responseData) {
        const responseEvent = {
            kind: this.dvmResponseKind,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['e', originalEvent.id], // Reference original request
                ['p', originalEvent.pubkey], // Send to requester
                ['request', originalEvent.id],
                ['status', 'success']
            ],
            content: JSON.stringify(responseData),
            pubkey: this.publicKey
        };

        const signedEvent = finishEvent(responseEvent, this.privateKey);

        // Publish to all relays
        for (const relay of this.dvmRelays) {
            await this.relayPool.publish(signedEvent, [relay]);
        }

        console.log(`✅ Response sent for request ${originalEvent.id.substring(0, 8)}...`);
    }

    async sendErrorResponse(originalEvent, errorMessage) {
        const errorEvent = {
            kind: this.dvmResponseKind,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['e', originalEvent.id],
                ['p', originalEvent.pubkey],
                ['status', 'error']
            ],
            content: JSON.stringify({
                type: 'error',
                error: errorMessage,
                timestamp: Date.now()
            }),
            pubkey: this.publicKey
        };

        const signedEvent = finishEvent(errorEvent, this.privateKey);

        for (const relay of this.dvmRelays) {
            await this.relayPool.publish(signedEvent, [relay]);
        }

        console.log(`❌ Error response sent: ${errorMessage}`);
    }
}

// Example usage and configuration
const config = {
    database: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'bigbrotr',
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
    },
    privateKey: process.env.DVM_PRIVATE_KEY,
    dvmRelays: (process.env.DVM_RELAYS || 'wss://relay.damus.io,wss://relay.snort.social').split(',')
};

// Start the DVM
const dvm = new RelayShadowDVM(config);

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Relay Shadow DVM...');
    await dvm.db.end();
    process.exit(0);
});

// Export for testing or integration
export { RelayShadowDVM };

// Auto-start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    dvm.start().catch(console.error);
}