#!/usr/bin/env node

// Simple DVM Test Client
import { generatePrivateKey, getPublicKey, finishEvent, validateEvent } from 'nostr-tools';
import process from 'process';

class DVMTestClient {
    constructor(dvmPublicKey) {
        this.privateKey = generatePrivateKey();
        this.publicKey = getPublicKey(this.privateKey);
        this.dvmPublicKey = dvmPublicKey;
        this.connections = new Map();
        this.responses = [];

        // Default relays
        this.relays = [
            'wss://relay.damus.io',
            'wss://relay.snort.social',
            'wss://nos.lol'
        ];

        console.log(`🔧 Test Client initialized`);
        console.log(`📡 Client pubkey: ${this.publicKey}`);
        console.log(`🎯 Target DVM: ${this.dvmPublicKey}`);
    }

    async connect() {
        console.log(`🌐 Connecting to ${this.relays.length} relays...`);

        const connectionPromises = this.relays.map(relay => this.connectToRelay(relay));
        const results = await Promise.allSettled(connectionPromises);

        const connected = results.filter(r => r.status === 'fulfilled').length;
        console.log(`✅ Connected to ${connected}/${this.relays.length} relays`);

        if (connected === 0) {
            throw new Error('Failed to connect to any relays');
        }

        // Subscribe to DVM responses
        await this.subscribeToResponses();
        return connected;
    }

    async connectToRelay(relayUrl) {
        return new Promise((resolve, reject) => {
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
                console.log(`  ✗ Failed to connect to ${relayUrl}`);
                reject(error);
            };

            ws.onmessage = (event) => {
                this.handleMessage(relayUrl, event.data);
            };

            ws.onclose = () => {
                this.connections.delete(relayUrl);
                console.log(`  ⚠ Disconnected from ${relayUrl}`);
            };
        });
    }

    handleMessage(relayUrl, message) {
        try {
            const [messageType, subscriptionId, event] = JSON.parse(message);

            if (messageType === 'EVENT' && event.kind === 6600) {
                // Check if this is a response to our request
                const isForUs = event.tags.some(tag => tag[0] === 'p' && tag[1] === this.publicKey);

                if (isForUs) {
                    console.log(`🎉 Received DVM response from ${relayUrl}`);
                    this.handleDVMResponse(event);
                }
            }
        } catch (error) {
            console.warn(`⚠ Invalid message from ${relayUrl}:`, error.message);
        }
    }

    handleDVMResponse(event) {
        try {
            const responseData = JSON.parse(event.content);
            this.responses.push(responseData);

            console.log('📊 DVM Response received:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            if (responseData.type === 'relay_recommendations') {
                console.log(`🎯 Type: ${responseData.type}`);
                console.log(`📈 Total recommendations: ${responseData.recommendations.primary?.length || 0}`);
                console.log(`🔒 Threat level: ${responseData.analysis?.threatLevel || 'unknown'}`);

                if (responseData.recommendations.primary?.length > 0) {
                    console.log(`\n🏆 Top recommendations:`);
                    responseData.recommendations.primary.slice(0, 3).forEach((rec, i) => {
                        console.log(`  ${i + 1}. ${rec.url}`);
                        console.log(`     Score: ${rec.scores.overall} | Privacy: ${rec.scores.privacy}`);
                        console.log(`     ${rec.reasoning}`);
                    });
                }
            } else if (responseData.type === 'relay_health_summary') {
                console.log(`🏥 Type: ${responseData.type}`);
                console.log(`📊 Total relays: ${responseData.summary.total}`);
                console.log(`✅ Healthy: ${responseData.summary.healthy}`);
                console.log(`⚠️  Issues: ${responseData.summary.issues}`);
            } else if (responseData.type === 'error') {
                console.log(`❌ Error: ${responseData.error}`);
            } else {
                console.log(`📦 Type: ${responseData.type}`);
                console.log(JSON.stringify(responseData, null, 2));
            }

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        } catch (error) {
            console.error('Failed to parse DVM response:', error);
        }
    }

    async subscribeToResponses() {
        const subscription = {
            kinds: [6600], // DVM response kind
            '#p': [this.publicKey], // Responses addressed to us
            since: Math.floor(Date.now() / 1000) - 300 // Last 5 minutes
        };

        const subscriptionId = `dvm-responses-${Date.now()}`;
        const subscribeMessage = ['REQ', subscriptionId, subscription];

        Array.from(this.connections.values()).forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(subscribeMessage));
            }
        });

        console.log('👂 Subscribed to DVM responses');
    }

    async sendRequest(requestType = 'recommend', options = {}) {
        const {
            threatLevel = 'medium',
            maxResults = 10,
            useCase = 'social',
            currentRelays = [],
            context = `Test ${requestType} request`
        } = options;

        const requestEvent = {
            kind: 5600, // DVM request kind
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['p', this.dvmPublicKey], // DVM public key
                ['param', 'request_type', requestType],
                ['param', 'threat_level', threatLevel],
                ['param', 'max_results', String(maxResults)]
            ],
            content: context,
            pubkey: this.publicKey
        };

        // Add optional parameters
        if (useCase) {
            requestEvent.tags.push(['param', 'use_case', useCase]);
        }

        if (requestType === 'analyze' && currentRelays.length > 0) {
            requestEvent.tags.push(['param', 'current_relays', currentRelays.join(',')]);
        }

        // Sign the event
        const signedEvent = finishEvent(requestEvent, this.privateKey);

        // Validate before sending
        if (!validateEvent(signedEvent)) {
            throw new Error('Invalid event signature');
        }

        // Send to all connected relays
        const publishPromises = Array.from(this.connections.entries()).map(([url, ws]) => {
            return this.publishEventToRelay(ws, signedEvent, url);
        });

        const results = await Promise.allSettled(publishPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;

        console.log(`📤 Request sent to ${successful}/${this.connections.size} relays`);
        console.log(`🔍 Request ID: ${signedEvent.id}`);
        console.log(`⏳ Waiting for DVM response...`);

        if (successful === 0) {
            throw new Error('Failed to send request to any relay');
        }

        return signedEvent;
    }

    async publishEventToRelay(ws, event, relayUrl) {
        return new Promise((resolve, reject) => {
            if (ws.readyState !== WebSocket.OPEN) {
                reject(new Error(`Relay ${relayUrl} not connected`));
                return;
            }

            const eventMessage = ['EVENT', event];
            ws.send(JSON.stringify(eventMessage));
            console.log(`  → Sent to ${relayUrl}`);
            resolve();
        });
    }

    async waitForResponse(timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for DVM response'));
            }, timeoutMs);

            const checkResponse = () => {
                if (this.responses.length > 0) {
                    clearTimeout(timeout);
                    resolve(this.responses[this.responses.length - 1]);
                } else {
                    setTimeout(checkResponse, 1000);
                }
            };

            checkResponse();
        });
    }

    async disconnect() {
        console.log('🔌 Disconnecting from relays...');
        Array.from(this.connections.values()).forEach(ws => ws.close());
        this.connections.clear();
        console.log('👋 Disconnected from all relays');
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.length === 0) {
        console.log(`
🔮 Relay Shadow DVM Test Client

Usage:
  node test-client.js --dvm-pubkey <pubkey> [options]

Required:
  --dvm-pubkey <pubkey>     Public key of the DVM to test

Options:
  --request-type <type>     Type of request (recommend, analyze, discover, health)
  --threat-level <level>    Threat level (low, medium, high, nation-state)
  --max-results <number>    Maximum number of results
  --use-case <case>         Use case (social, journalism, activism, etc.)
  --current-relays <urls>   Comma-separated list of current relays (for analyze)
  --timeout <ms>            Timeout in milliseconds (default: 30000)

Examples:
  # Basic recommendation request
  node test-client.js --dvm-pubkey abc123... --request-type recommend --threat-level high

  # Analyze current setup  
  node test-client.js --dvm-pubkey abc123... --request-type analyze --current-relays "wss://relay.damus.io,wss://relay.snort.social"

  # Health check
  node test-client.js --dvm-pubkey abc123... --request-type health
        `);
        process.exit(0);
    }

    const dvmPubkeyArg = args.indexOf('--dvm-pubkey');
    if (dvmPubkeyArg === -1 || !args[dvmPubkeyArg + 1]) {
        console.error('❌ --dvm-pubkey is required');
        process.exit(1);
    }

    const dvmPubkey = args[dvmPubkeyArg + 1];

    // Parse other arguments
    const requestType = args[args.indexOf('--request-type') + 1] || 'recommend';
    const threatLevel = args[args.indexOf('--threat-level') + 1] || 'medium';
    const maxResults = parseInt(args[args.indexOf('--max-results') + 1]) || 10;
    const useCase = args[args.indexOf('--use-case') + 1] || 'social';
    const currentRelaysArg = args[args.indexOf('--current-relays') + 1];
    const currentRelays = currentRelaysArg ? currentRelaysArg.split(',') : [];
    const timeout = parseInt(args[args.indexOf('--timeout') + 1]) || 30000;

    const client = new DVMTestClient(dvmPubkey);

    try {
        // Connect to relays
        await client.connect();

        // Send request
        await client.sendRequest(requestType, {
            threatLevel,
            maxResults,
            useCase,
            currentRelays
        });

        // Wait for response
        console.log(`⏳ Waiting up to ${timeout / 1000}s for response...`);
        await client.waitForResponse(timeout);

        console.log('✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        await client.disconnect();
    }
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { DVMTestClient };