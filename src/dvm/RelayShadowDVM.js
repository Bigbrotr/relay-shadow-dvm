// Relay Shadow DVM - Privacy-Focused Relay Recommendation Service
// Built for Bitcoin++ Privacy Hackathon 2025

import { Pool } from 'pg';
import { generatePrivateKey, getPublicKey, finishEvent, validateEvent } from 'nostr-tools';

class RelayShadowDVM {
    constructor(config) {
        this.db = new Pool(config.database);
        this.privateKey = config.privateKey || generatePrivateKey();
        this.publicKey = getPublicKey(this.privateKey);
        this.dvmRelays = config.dvmRelays || ['wss://relay.damus.io', 'wss://relay.snort.social', 'wss://nos.lol'];

        // DVM Configuration
        this.dvmKind = 5600; // DVM request kind
        this.dvmResponseKind = 6600; // DVM response kind
        this.dvmJobRequestKind = 68001; // Custom job request kind for relay recommendations

        // WebSocket connections
        this.connections = new Map();
        this.subscriptions = new Map();

        console.log(`🔮 Relay Shadow DVM initialized`);
        console.log(`📡 Public Key: ${this.publicKey}`);
        console.log(`🌐 Monitoring relays: ${this.dvmRelays.join(', ')}`);
    }

    async start() {
        try {
            // Connect to relays
            console.log(`🌐 Connecting to ${this.dvmRelays.length} relays...`);

            const connectionPromises = this.dvmRelays.map(relay => this.connectToRelay(relay));
            const results = await Promise.allSettled(connectionPromises);

            const connected = results.filter(r => r.status === 'fulfilled').length;
            console.log(`✅ Connected to ${connected}/${this.dvmRelays.length} relays`);

            if (connected === 0) {
                throw new Error('Failed to connect to any relays');
            }

            // Subscribe to DVM requests
            await this.subscribeToRequests();

            console.log('✅ Relay Shadow DVM is now listening for requests...');
            return true;

        } catch (error) {
            console.error('❌ Failed to start DVM:', error);
            throw error;
        }
    }

    async connectToRelay(relayUrl) {
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(relayUrl);
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error(`Connection timeout: ${relayUrl}`));
                }, 10000);

                ws.onopen = () => {
                    clearTimeout(timeout);
                    this.connections.set(relayUrl, ws);
                    console.log(`  ✓ Connected to ${relayUrl}`);
                    resolve(ws);
                };

                ws.onerror = (error) => {
                    clearTimeout(timeout);
                    console.log(`  ✗ Failed to connect to ${relayUrl}:`, error.message);
                    reject(error);
                };

                ws.onmessage = (event) => {
                    this.handleRelayMessage(relayUrl, event.data);
                };

                ws.onclose = (event) => {
                    this.connections.delete(relayUrl);
                    console.log(`  ⚠ Disconnected from ${relayUrl}`, event.code);

                    // Attempt reconnection after delay
                    setTimeout(() => {
                        this.connectToRelay(relayUrl).catch(() => {
                            console.log(`Failed to reconnect to ${relayUrl}`);
                        });
                    }, 5000);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    handleRelayMessage(relayUrl, message) {
        try {
            const parsed = JSON.parse(message);
            const [messageType, subscriptionId, event] = parsed;

            switch (messageType) {
                case 'EVENT':
                    if (this.isDVMRequest(event)) {
                        console.log(`📨 Received DVM request from ${relayUrl}`);
                        this.handleDVMRequest(event);
                    }
                    break;
                case 'NOTICE':
                    console.log(`📢 Notice from ${relayUrl}:`, subscriptionId);
                    break;
                case 'EOSE':
                    console.log(`📄 End of stored events from ${relayUrl}`);
                    break;
                case 'OK':
                    console.log(`✅ Event accepted by ${relayUrl}:`, subscriptionId);
                    break;
                default:
                    // Unknown message type
                    break;
            }
        } catch (error) {
            console.warn(`⚠ Invalid message from ${relayUrl}:`, error.message);
        }
    }

    isDVMRequest(event) {
        if (event.kind !== this.dvmKind) return false;

        // Check if addressed to our DVM
        const isForUs = event.tags.some(tag =>
            tag[0] === 'p' && tag[1] === this.publicKey
        );

        return isForUs;
    }

    async subscribeToRequests() {
        const subscription = {
            kinds: [this.dvmKind],
            '#p': [this.publicKey], // Requests addressed to us
            since: Math.floor(Date.now() / 1000) - 3600 // Last hour
        };

        const subscriptionId = `dvm-requests-${Date.now()}`;
        this.subscriptions.set(subscriptionId, subscription);

        const subscribeMessage = ['REQ', subscriptionId, subscription];

        Array.from(this.connections.values()).forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(subscribeMessage));
            }
        });

        console.log('👂 Subscribed to DVM requests');
    }

    async handleDVMRequest(event) {
        try {
            console.log(`📨 Processing DVM request from ${event.pubkey.substring(0, 8)}...`);

            // Validate the request
            if (!validateEvent(event)) {
                console.log('❌ Invalid event received');
                return;
            }

            // Parse request parameters
            const request = this.parseRequest(event);
            console.log(`🔍 Request type: ${request.type}, Threat level: ${request.threatLevel}`);

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
            maxResults: 10,
            preferences: {}
        };

        // Parse tags for parameters
        for (const tag of event.tags) {
            switch (tag[0]) {
                case 'param':
                    if (tag[1] === 'threat_level') request.threatLevel = tag[2];
                    if (tag[1] === 'use_case') request.useCase = tag[2];
                    if (tag[1] === 'request_type') request.type = tag[2];
                    if (tag[1] === 'current_relays') request.currentRelays = tag[2].split(',').filter(r => r.trim());
                    if (tag[1] === 'max_results') request.maxResults = parseInt(tag[2]) || 10;
                    break;
                case 'relay':
                    if (tag[1]) request.currentRelays.push(tag[1]);
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

        try {
            const query = `
                SELECT * FROM get_user_relay_recommendations($1, $2, $3, true)
            `;

            const result = await this.db.query(query, [userPubkey, threatLevel, maxResults]);

            if (result.rows.length === 0) {
                // Fallback to general recommendations
                console.log('No personalized recommendations found, using general approach');
                const fallbackQuery = `
                    SELECT 
                        url as relay_url,
                        overall_score,
                        privacy_score,
                        reliability_score,
                        0 as following_users_count,
                        0.0 as total_influence_weight,
                        'General recommendation based on threat level' as reasoning
                    FROM relay_recommendations 
                    WHERE current_status = true 
                    AND overall_score > CASE 
                        WHEN $1 = 'low' THEN 5.0
                        WHEN $1 = 'medium' THEN 6.0
                        WHEN $1 = 'high' THEN 7.0
                        WHEN $1 = 'nation-state' THEN 8.0
                        ELSE 6.0
                    END
                    ORDER BY overall_score DESC
                    LIMIT $2
                `;

                const fallbackResult = await this.db.query(fallbackQuery, [threatLevel, maxResults]);
                result.rows = fallbackResult.rows;
            }

            const recommendations = result.rows.map(row => ({
                url: row.relay_url,
                scores: {
                    overall: parseFloat(row.overall_score) || 0,
                    privacy: parseFloat(row.privacy_score) || 0,
                    reliability: parseFloat(row.reliability_score) || 0
                },
                network: {
                    followingUsersHere: parseInt(row.following_users_count) || 0,
                    totalInfluenceWeight: parseFloat(row.total_influence_weight) || 0
                },
                reasoning: row.reasoning || 'Quality relay recommendation'
            }));

            // Get additional analytics
            const coverageAnalysis = await this.analyzeUserCoverage(userPubkey, request.currentRelays);
            const totalRelays = await this.getTotalRelayCount();

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
                    suggestions: coverageAnalysis.suggestions,
                    totalRecommendations: recommendations.length
                },
                metadata: {
                    generated_at: Date.now(),
                    total_relays_analyzed: totalRelays,
                    algorithm_version: '1.0'
                }
            };

        } catch (error) {
            console.error('Error generating recommendations:', error);
            throw new Error(`Failed to generate recommendations: ${error.message}`);
        }
    }

    async analyzeCurrentSetup(request) {
        const { userPubkey, currentRelays = [] } = request;

        console.log(`📊 Analyzing current setup for ${currentRelays.length} relays`);

        try {
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

        } catch (error) {
            console.error('Error analyzing setup:', error);
            throw new Error(`Failed to analyze setup: ${error.message}`);
        }
    }

    async generateDiscoveryRecommendations(request) {
        const { userPubkey, currentRelays = [], maxResults = 5 } = request;

        console.log(`🔭 Generating discovery recommendations`);

        try {
            const query = `
                SELECT * FROM get_discovery_relays($1, $2, $3)
            `;

            const result = await this.db.query(query, [userPubkey, currentRelays, maxResults]);

            const discoveries = result.rows.map(row => ({
                url: row.relay_url,
                discoveryScore: parseFloat(row.discovery_score) || 0,
                uniquePublishers: parseInt(row.unique_quality_publishers) || 0,
                avgInfluence: parseFloat(row.avg_publisher_influence) || 0,
                reasoning: row.reasoning || 'Discovery recommendation'
            }));

            return {
                type: 'discovery_recommendations',
                discoveries,
                summary: `Found ${discoveries.length} relays with quality content you might enjoy`,
                metadata: {
                    generated_at: Date.now(),
                    user_pubkey: userPubkey.substring(0, 8) + '...'
                }
            };

        } catch (error) {
            console.error('Error generating discovery:', error);
            throw new Error(`Failed to generate discovery recommendations: ${error.message}`);
        }
    }

    async getRelayHealthSummary(request) {
        console.log(`🏥 Generating relay health summary`);

        try {
            const query = `
                SELECT * FROM get_relay_health_summary()
                ORDER BY 
                    CASE health_status
                        WHEN 'HEALTHY' THEN 1
                        WHEN 'SLOW' THEN 2  
                        WHEN 'UNSTABLE' THEN 3
                        WHEN 'INACTIVE' THEN 4
                        WHEN 'DOWN' THEN 5
                    END,
                    uptime_7d DESC
                LIMIT 50
            `;

            const result = await this.db.query(query);

            const healthSummary = result.rows.map(row => ({
                url: row.relay_url,
                status: row.health_status,
                uptime: parseFloat(row.uptime_7d) || 0,
                latency: parseInt(row.avg_latency_ms) || 0,
                recentActivity: parseInt(row.recent_events_24h) || 0,
                issues: row.issues || []
            }));

            // Categorize relays
            const categorized = {
                healthy: healthSummary.filter(r => r.status === 'HEALTHY'),
                slow: healthSummary.filter(r => r.status === 'SLOW'),
                unstable: healthSummary.filter(r => r.status === 'UNSTABLE'),
                inactive: healthSummary.filter(r => r.status === 'INACTIVE'),
                down: healthSummary.filter(r => r.status === 'DOWN')
            };

            return {
                type: 'relay_health_summary',
                summary: {
                    total: healthSummary.length,
                    healthy: categorized.healthy.length,
                    issues: healthSummary.length - categorized.healthy.length,
                    categories: Object.fromEntries(
                        Object.entries(categorized).map(([k, v]) => [k, v.length])
                    )
                },
                categories: categorized,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Error getting health summary:', error);
            throw new Error(`Failed to get relay health summary: ${error.message}`);
        }
    }

    async analyzeUserCoverage(userPubkey, currentRelays) {
        try {
            // Get user's following network coverage
            const coverageQuery = `
                WITH user_following AS (
                    SELECT DISTINCT (tag->>1)::TEXT as followed_pubkey
                    FROM events e, jsonb_array_elements(e.tags) as tag
                    WHERE e.pubkey = $1 AND e.kind = 3 AND tag->>0 = 'p'
                    AND LENGTH(tag->>1) = 64
                    ORDER BY e.created_at DESC LIMIT 500
                )
                SELECT 
                    COUNT(DISTINCT uf.followed_pubkey) as total_following,
                    COUNT(DISTINCT CASE WHEN rpw.relay_url = ANY($2) THEN uf.followed_pubkey END) as covered_following
                FROM user_following uf
                LEFT JOIN relay_publisher_weights rpw ON uf.followed_pubkey = rpw.pubkey
            `;

            const result = await this.db.query(coverageQuery, [userPubkey, currentRelays]);
            const { total_following = 0, covered_following = 0 } = result.rows[0] || {};

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

        } catch (error) {
            console.error('Error analyzing coverage:', error);
            return {
                coverage: "Unable to calculate",
                suggestions: ["Analysis temporarily unavailable"]
            };
        }
    }

    async getTotalRelayCount() {
        try {
            const result = await this.db.query(`
                SELECT COUNT(*) FROM relay_recommendations WHERE current_status = true
            `);
            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            console.error('Error getting relay count:', error);
            return 0;
        }
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

        // Publish to all connected relays
        const publishPromises = Array.from(this.connections.entries()).map(([url, ws]) => {
            return this.publishEventToRelay(ws, signedEvent, url);
        });

        const results = await Promise.allSettled(publishPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;

        console.log(`✅ Response sent to ${successful}/${this.connections.size} relays for request ${originalEvent.id.substring(0, 8)}...`);
    }

    async publishEventToRelay(ws, event, relayUrl) {
        return new Promise((resolve, reject) => {
            if (ws.readyState !== WebSocket.OPEN) {
                reject(new Error(`Relay ${relayUrl} not connected`));
                return;
            }

            const eventMessage = ['EVENT', event];
            ws.send(JSON.stringify(eventMessage));
            console.log(`  → Sent response to ${relayUrl}`);
            resolve();
        });
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

        const publishPromises = Array.from(this.connections.entries()).map(([url, ws]) => {
            return this.publishEventToRelay(ws, signedEvent, url);
        });

        await Promise.allSettled(publishPromises);
        console.log(`❌ Error response sent: ${errorMessage}`);
    }

    async disconnect() {
        console.log('🔌 Disconnecting from relays...');

        // Close all connections
        Array.from(this.connections.values()).forEach(ws => {
            ws.close();
        });
        this.connections.clear();
        this.subscriptions.clear();

        console.log('👋 Disconnected from all relays');
    }
}

// Export for use
export { RelayShadowDVM };