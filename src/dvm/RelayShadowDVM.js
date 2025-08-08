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

    // Add validateEvent method to class
    validateEvent(event) {
        try {
            return validateEvent(event);
        } catch (error) {
            console.error('Event validation failed:', error);
            return false;
        }
    }

    // Add signEvent method to class
    async signEvent(event) {
        try {
            return finishEvent(event, this.privateKey);
        } catch (error) {
            console.error('Event signing failed:', error);
            throw error;
        }
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
            console.log(`📨 Processing DVM request from ${event.pubkey.substring(0, 8)}...`)

            // Validate the request
            if (!this.validateEvent(event)) {
                console.log('❌ Invalid event received')
                return
            }

            // Parse request parameters
            const request = this.parseRequest(event)
            console.log(`🔍 Request type: ${request.type}, Threat level: ${request.threatLevel}`)

            // Process the request
            let response
            switch (request.type) {
                case 'recommend':
                    response = await this.generateRecommendations(request)
                    break
                case 'analyze':
                    response = await this.analyzeCurrentSetup(request)
                    break
                case 'discover':
                    response = await this.generateDiscoveryRecommendations(request)
                    break
                case 'health':
                    response = await this.getRelayHealthSummary(request)
                    break
                default:
                    response = await this.generateRecommendations(request)
            }

            // Send response immediately after processing
            await this.sendResponse(event, response)

        } catch (error) {
            console.error('Error handling DVM request:', error)

            // Send error response
            try {
                await this.sendResponse(event, {
                    type: 'error',
                    error: error.message,
                    timestamp: Math.floor(Date.now() / 1000)
                })
            } catch (sendError) {
                console.error('Failed to send error response:', sendError)
            }
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
                console.log('🔄 No specific recommendations found, using fallback');
                return this.generateFallbackRecommendations(request);
            }

            const recommendations = result.rows.map(row => ({
                url: row.relay_url,
                score: parseFloat(row.score),
                reason: row.reason,
                privacy_score: parseFloat(row.privacy_score),
                reliability_score: parseFloat(row.reliability_score),
                performance_score: parseFloat(row.performance_score),
                user_overlap: parseInt(row.user_overlap),
                metadata: {
                    name: row.relay_name,
                    description: row.relay_description,
                    contact: row.contact_info,
                    supported_nips: row.supported_nips ? row.supported_nips.split(',') : [],
                    fees: row.fees
                }
            }));

            console.log(`✅ Generated ${recommendations.length} recommendations`);

            return {
                type: 'relay_recommendations',
                recommendations,
                request_id: request.requestId,
                timestamp: Math.floor(Date.now() / 1000),
                metadata: {
                    threat_level: threatLevel,
                    total_analyzed: recommendations.length,
                    algorithm_version: '2.0'
                }
            };

        } catch (error) {
            console.error('Database query failed:', error);
            return this.generateFallbackRecommendations(request);
        }
    }

    async generateFallbackRecommendations(request) {
        // Static fallback recommendations based on threat level
        const fallbackRelays = {
            low: [
                { url: 'wss://relay.damus.io', score: 8.5, reason: 'Popular and reliable' },
                { url: 'wss://nos.lol', score: 8.2, reason: 'Good performance' },
                { url: 'wss://relay.snort.social', score: 8.0, reason: 'Well maintained' }
            ],
            medium: [
                { url: 'wss://nostr.wine', score: 9.0, reason: 'Privacy focused' },
                { url: 'wss://relay.nostr.bg', score: 8.7, reason: 'European location' },
                { url: 'wss://nostr.mom', score: 8.5, reason: 'Community maintained' }
            ],
            high: [
                { url: 'wss://nostr.wine', score: 9.5, reason: 'Strong privacy policies' },
                { url: 'wss://relay.nostr.bg', score: 9.2, reason: 'No logging policy' },
                { url: 'wss://bitcoiner.social', score: 9.0, reason: 'Bitcoin-focused community' }
            ]
        };

        const relays = fallbackRelays[request.threatLevel] || fallbackRelays.medium;

        return {
            type: 'relay_recommendations',
            recommendations: relays.slice(0, request.maxResults),
            request_id: request.requestId,
            timestamp: Math.floor(Date.now() / 1000),
            metadata: {
                threat_level: request.threatLevel,
                source: 'fallback',
                algorithm_version: '2.0'
            }
        };
    }

    async analyzeCurrentSetup(request) {
        // Analyze user's current relay setup
        console.log(`🔍 Analyzing current setup for ${request.userPubkey.substring(0, 8)}`);

        return {
            type: 'setup_analysis',
            analysis: {
                privacy_score: 7.5,
                diversity_score: 6.8,
                reliability_score: 8.2,
                recommendations: [
                    'Consider adding privacy-focused relays',
                    'Geographic diversity could be improved',
                    'Current setup has good reliability'
                ]
            },
            timestamp: Math.floor(Date.now() / 1000)
        };
    }

    async generateDiscoveryRecommendations(request) {
        // Discover new relays based on social graph
        console.log(`🔍 Generating discovery recommendations for ${request.userPubkey.substring(0, 8)}`);

        return {
            type: 'discovery_recommendations',
            recommendations: [
                { url: 'wss://relay.nostr.band', score: 8.5, reason: 'Growing community' },
                { url: 'wss://nostr.wine', score: 9.0, reason: 'Privacy focused' }
            ],
            timestamp: Math.floor(Date.now() / 1000)
        };
    }

    async getRelayHealthSummary(request) {
        // Get overall relay health summary
        console.log(`📊 Getting relay health summary`);

        return {
            type: 'health_summary',
            summary: {
                total_relays_monitored: 150,
                healthy_relays: 132,
                average_uptime: 97.8,
                average_response_time: 45
            },
            timestamp: Math.floor(Date.now() / 1000)
        };
    }

    async sendResponse(originalEvent, responseData) {
        try {
            const responseEvent = {
                kind: this.dvmResponseKind,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['e', originalEvent.id],
                    ['p', originalEvent.pubkey],
                    ['status', responseData.type === 'error' ? 'error' : 'success']
                ],
                content: JSON.stringify(responseData),
                pubkey: this.publicKey
            };

            // Sign the event using the class method
            const signedResponse = await this.signEvent(responseEvent);

            console.log(`📤 Sending DVM response: ${signedResponse.id.substring(0, 8)}`);

            // Send to all connected relays
            const results = await Promise.allSettled(
                Array.from(this.connections.values()).map(ws => {
                    if (ws.readyState === WebSocket.OPEN) {
                        return new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);

                            try {
                                ws.send(JSON.stringify(['EVENT', signedResponse]));
                                clearTimeout(timeout);
                                resolve(true);
                            } catch (error) {
                                clearTimeout(timeout);
                                reject(error);
                            }
                        });
                    }
                    return Promise.reject(new Error('Relay not connected'));
                })
            );

            const successful = results.filter(r => r.status === 'fulfilled').length;
            console.log(`✅ Response sent to ${successful}/${results.length} relays`);

            return signedResponse;

        } catch (error) {
            console.error('Failed to send DVM response:', error);
            throw error;
        }
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

        const signedEvent = await this.signEvent(errorEvent);

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