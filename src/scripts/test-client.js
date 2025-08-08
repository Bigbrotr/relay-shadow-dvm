#!/usr/bin/env node

// Fixed DVM Test Client with improved error handling and message parsing
// src/scripts/test-client.js

import { generatePrivateKey, getPublicKey, finishEvent, validateEvent } from 'nostr-tools'
import { decode } from 'nostr-tools/nip19'
import process from 'process'

class DVMTestClient {
    constructor(dvmPublicKey) {
        this.privateKey = generatePrivateKey()
        this.publicKey = getPublicKey(this.privateKey)

        // Validate and clean the DVM public key
        this.dvmPublicKey = this.validateAndCleanPubkey(dvmPublicKey)

        this.connections = new Map()
        this.responses = []
        this.pendingEvents = new Map()

        // Default relays
        this.relays = [
            'wss://relay.damus.io',
            'wss://relay.snort.social',
            'wss://nos.lol',
            'wss://relay.nostr.band'
        ]

        console.log(`🔧 Test Client initialized`)
        console.log(`📡 Client pubkey: ${this.publicKey}`)
        console.log(`🎯 Target DVM: ${this.dvmPublicKey}`)
    }

    validateAndCleanPubkey(pubkey) {
        if (!pubkey || typeof pubkey !== 'string') {
            throw new Error('DVM public key is required and must be a string')
        }

        // Remove any whitespace
        pubkey = pubkey.trim()

        // Handle npub format (bech32) - now synchronous
        if (pubkey.startsWith('npub1')) {
            try {
                const decoded = decode(pubkey)
                if (decoded.type === 'npub') {
                    pubkey = decoded.data
                }
            } catch (error) {
                throw new Error(`Invalid npub format: ${error.message}`)
            }
        }

        // Validate hex format
        if (!/^[a-f0-9]{64}$/i.test(pubkey)) {
            throw new Error(`Invalid public key format. Expected 64-character hex string, got: ${pubkey} (${pubkey.length} chars)`)
        }

        return pubkey.toLowerCase()
    }

    async connect() {
        console.log(`🌐 Connecting to ${this.relays.length} relays...`)

        const connectionPromises = this.relays.map(relay => this.connectToRelay(relay))
        const results = await Promise.allSettled(connectionPromises)

        const connected = results.filter(r => r.status === 'fulfilled').length
        console.log(`✅ Connected to ${connected}/${this.relays.length} relays`)

        if (connected === 0) {
            throw new Error('Failed to connect to any relays')
        }

        // Subscribe to DVM responses
        await this.subscribeToResponses()
        return connected
    }

    async connectToRelay(relayUrl) {
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(relayUrl)
                const timeout = setTimeout(() => {
                    if (ws.readyState === WebSocket.CONNECTING) {
                        ws.close()
                        reject(new Error(`Connection timeout: ${relayUrl}`))
                    }
                }, 15000)

                ws.onopen = () => {
                    clearTimeout(timeout)
                    this.connections.set(relayUrl, ws)
                    console.log(`  ✓ Connected to ${relayUrl}`)
                    resolve(ws)
                }

                ws.onerror = (error) => {
                    clearTimeout(timeout)
                    console.log(`  ✗ Failed to connect to ${relayUrl}:`, error.message || 'Connection failed')
                    reject(error)
                }

                ws.onmessage = (event) => {
                    this.handleMessage(relayUrl, event.data)
                }

                ws.onclose = (event) => {
                    this.connections.delete(relayUrl)
                    console.log(`  ⚠ Disconnected from ${relayUrl} (code: ${event.code})`)
                }

            } catch (error) {
                reject(error)
            }
        })
    }

    handleMessage(relayUrl, message) {
        try {
            const parsed = JSON.parse(message)

            if (!Array.isArray(parsed) || parsed.length < 2) {
                console.warn(`Invalid message format from ${relayUrl}`)
                return
            }

            const [messageType, ...args] = parsed

            switch (messageType) {
                case 'EVENT':
                    this.handleEventMessage(relayUrl, args)
                    break
                case 'OK':
                    this.handleOkMessage(relayUrl, args)
                    break
                case 'NOTICE':
                    console.log(`📢 Notice from ${relayUrl}:`, args[0])
                    break
                case 'EOSE':
                    console.log(`📄 End of stored events from ${relayUrl}`)
                    break
                case 'AUTH':
                    console.log(`🔐 Auth challenge from ${relayUrl}`)
                    break
                case 'CLOSED':
                    console.log(`🚫 Subscription closed by ${relayUrl}:`, args[1])
                    break
                default:
                    console.log(`❓ Unknown message type from ${relayUrl}:`, messageType)
                    break
            }
        } catch (error) {
            console.warn(`⚠ Invalid message from ${relayUrl}:`, error.message)
        }
    }

    handleEventMessage(relayUrl, args) {
        if (args.length < 2) {
            console.warn(`Invalid EVENT message from ${relayUrl}`)
            return
        }

        const [subscriptionId, event] = args

        if (this.isDVMResponse(event)) {
            console.log(`📨 Received DVM response from ${relayUrl}`)
            this.processDVMResponse(event)
        }
    }

    handleOkMessage(relayUrl, args) {
        if (args.length < 2) {
            console.warn(`Invalid OK message from ${relayUrl}`)
            return
        }

        const [eventId, accepted, reason] = args

        if (accepted) {
            console.log(`✅ Event accepted by ${relayUrl}: ${eventId?.substring(0, 8)}`)
        } else {
            console.log(`❌ Event rejected by ${relayUrl}: ${reason || 'Unknown reason'}`)
        }

        // Resolve pending event if exists
        if (this.pendingEvents.has(eventId)) {
            const { resolve, reject } = this.pendingEvents.get(eventId)
            this.pendingEvents.delete(eventId)

            if (accepted) {
                resolve({ relayUrl, accepted: true })
            } else {
                reject(new Error(`Event rejected by ${relayUrl}: ${reason}`))
            }
        }
    }

    isDVMResponse(event) {
        if (!event || event.kind !== 5601) return false

        // Check if addressed to us
        const isForUs = event.tags && event.tags.some(tag =>
            Array.isArray(tag) && tag.length >= 2 && tag[0] === 'p' && tag[1] === this.publicKey
        )

        return isForUs
    }

    processDVMResponse(event) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`📨 DVM Response Received!`)
        console.log(`🔍 Event ID: ${event.id}`)
        console.log(`👤 From DVM: ${event.pubkey.substring(0, 16)}...`)
        console.log(`⏰ Timestamp: ${new Date(event.created_at * 1000).toISOString()}`)

        try {
            // Try to parse as JSON first
            let responseData
            try {
                responseData = JSON.parse(event.content)
            } catch (e) {
                // If not JSON, treat as plain text response
                responseData = {
                    type: 'text_response',
                    content: event.content
                }
            }

            this.responses.push(responseData)

            // Display response based on type
            if (responseData.type === 'relay_recommendations') {
                console.log(`🎯 Type: ${responseData.type}`)

                // Handle both old and new response formats
                const recommendations = responseData.recommendations?.primary ||
                    responseData.recommendations ||
                    []

                console.log(`📊 Found ${recommendations.length} recommendations:`)

                recommendations.forEach((rec, i) => {
                    console.log(`  ${i + 1}. ${rec.url}`)
                    console.log(`     Score: ${rec.scores?.overall || 'N/A'} | Privacy: ${rec.scores?.privacy || 'N/A'}`)
                    console.log(`     ${rec.reasoning || 'No reasoning provided'}`)
                })

                // Show backup recommendations if available
                if (responseData.recommendations?.backup?.length > 0) {
                    console.log(`\n📋 Backup recommendations:`)
                    responseData.recommendations.backup.forEach((rec, i) => {
                        console.log(`  ${i + 1}. ${rec.url} (Score: ${rec.scores?.overall || 'N/A'})`)
                    })
                }

            } else if (responseData.type === 'relay_analysis') {
                console.log(`🔍 Type: ${responseData.type}`)
                console.log(`📊 Analysis results:`)

                if (responseData.current_relays) {
                    console.log(`  Current relays analyzed: ${responseData.current_relays.length}`)
                    responseData.current_relays.forEach((relay, i) => {
                        console.log(`    ${i + 1}. ${relay.url} - Score: ${relay.score || 'N/A'}`)
                    })
                }

                if (responseData.recommendations) {
                    console.log(`  Improvement recommendations: ${responseData.recommendations.length}`)
                    responseData.recommendations.forEach((rec, i) => {
                        console.log(`    ${i + 1}. ${rec.url} - ${rec.reasoning}`)
                    })
                }
            } else if (responseData.type === 'discovery_recommendations') {
                console.log(`🔮 Type: ${responseData.type}`)

                const discoveries = responseData.discoveries || responseData.recommendations || []
                console.log(`📊 Discovery recommendations: ${discoveries.length}`)

                discoveries.forEach((rec, i) => {
                    console.log(`  ${i + 1}. ${rec.url}`)
                    console.log(`     Discovery Score: ${rec.discoveryScore || rec.scores?.discovery || 'N/A'}`)
                    console.log(`     Publishers: ${rec.uniquePublishers || rec.unique_quality_publishers || 'N/A'}`)
                    console.log(`     ${rec.reasoning || 'No reasoning provided'}`)
                })
            } else if (responseData.type === 'relay_health_summary') {
                console.log(`🏥 Type: ${responseData.type}`)
                console.log(`📊 Health summary:`)

                if (responseData.summary) {
                    console.log(`  Total relays: ${responseData.summary.total || 'N/A'}`)
                    console.log(`  Healthy: ${responseData.summary.healthy || 'N/A'}`)
                    console.log(`  With issues: ${responseData.summary.issues || 'N/A'}`)
                }

                // Handle both old and new formats
                const relays = responseData.relays || responseData.categories?.healthy || []
                if (relays.length > 0) {
                    console.log(`  Relay details: ${relays.length}`)
                    relays.slice(0, 5).forEach((relay, i) => {
                        const url = relay.relay_url || relay.url
                        const status = relay.health_status || relay.status
                        console.log(`    ${i + 1}. ${url} - ${status}`)
                    })

                    if (relays.length > 5) {
                        console.log(`    ... and ${relays.length - 5} more`)
                    }
                }
            } else if (responseData.type === 'error') {
                console.log(`❌ Error response: ${responseData.error || responseData.message}`)
            } else {
                console.log(`📦 Type: ${responseData.type || 'unknown'}`)

                // Show content for unknown types
                if (responseData.content) {
                    console.log(`📄 Content: ${responseData.content}`)
                } else {
                    console.log('📄 Raw response:')
                    console.log(JSON.stringify(responseData, null, 2))
                }
            }

        } catch (error) {
            console.error('❌ Failed to parse DVM response:', error)
            console.log('📄 Raw content:')
            console.log(event.content)
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }

    async subscribeToResponses() {
        const subscription = {
            kinds: [5601],
            '#p': [this.publicKey], // Responses addressed to us
            since: Math.floor(Date.now() / 1000) - 300 // Last 5 minutes
        }

        const subscriptionId = `dvm-responses-${Date.now()}`
        const subscribeMessage = ['REQ', subscriptionId, subscription]

        let subscribed = 0
        Array.from(this.connections.values()).forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify(subscribeMessage))
                    subscribed++
                } catch (error) {
                    console.warn('Failed to send subscription:', error)
                }
            }
        })

        console.log(`👂 Subscribed to DVM responses on ${subscribed} relays`)
        return subscribed > 0
    }

    async sendRequest(requestType = 'recommend', options = {}) {
        const {
            threatLevel = 'medium',
            maxResults = 10,
            useCase = 'social',
            currentRelays = [],
            context = `Test ${requestType} request`
        } = options

        const requestEvent = {
            kind: 5600, // DVM request kind
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['p', this.dvmPublicKey], // DVM public key - make sure it's 64 chars hex
                ['param', 'request_type', requestType],
                ['param', 'threat_level', threatLevel],
                ['param', 'max_results', String(maxResults)]
            ],
            content: context,
        }

        // Validate the p tag before sending
        const pTag = requestEvent.tags.find(tag => tag[0] === 'p')
        if (!pTag || !pTag[1] || pTag[1].length !== 64) {
            throw new Error(`Invalid p tag pubkey: ${pTag ? pTag[1] : 'missing'} (should be 64 hex chars)`)
        }

        // Add optional parameters
        if (useCase) {
            requestEvent.tags.push(['param', 'use_case', useCase])
        }

        if (requestType === 'analyze' && currentRelays.length > 0) {
            requestEvent.tags.push(['param', 'current_relays', currentRelays.join(',')])
        }

        // Add client info
        requestEvent.tags.push(['client', 'relay-shadow-test-client', '1.0.0'])

        // Sign the event
        const signedEvent = finishEvent(requestEvent, this.privateKey)

        // Validate before sending
        if (!validateEvent(signedEvent)) {
            throw new Error('Invalid event signature')
        }

        console.log(`📤 Sending ${requestType} request...`)
        console.log(`   Threat level: ${threatLevel}`)
        console.log(`   Max results: ${maxResults}`)
        if (currentRelays.length > 0) {
            console.log(`   Current relays: ${currentRelays.join(', ')}`)
        }

        // Send to all connected relays with improved error handling
        const publishPromises = Array.from(this.connections.entries()).map(([url, ws]) => {
            return this.publishEventToRelay(ws, signedEvent, url)
        })

        const results = await Promise.allSettled(publishPromises)
        const successful = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected')

        if (failed.length > 0) {
            console.log(`⚠ Some relays rejected the event:`)
            failed.forEach((result, i) => {
                console.log(`   ${result.reason}`)
            })
        }

        console.log(`📤 Request sent to ${successful}/${results.length} relays`)

        if (successful === 0) {
            throw new Error('Failed to send request to any relays')
        }

        return { successful, total: results.length, signedEvent }
    }

    async publishEventToRelay(ws, event, relayUrl) {
        return new Promise((resolve, reject) => {
            if (ws.readyState !== WebSocket.OPEN) {
                reject(new Error(`Relay ${relayUrl} not connected (state: ${ws.readyState})`))
                return
            }

            try {
                const eventMessage = ['EVENT', event]
                ws.send(JSON.stringify(eventMessage))
                console.log(`  → Sent to ${relayUrl}`)

                // Set up timeout for OK response
                const timeout = setTimeout(() => {
                    console.log(`  ⏰ Timeout waiting for OK from ${relayUrl}`)
                    resolve() // Don't reject on timeout
                }, 10000)

                // Store pending event for OK tracking
                this.pendingEvents.set(event.id, {
                    resolve: () => {
                        clearTimeout(timeout)
                        resolve()
                    },
                    reject: (error) => {
                        clearTimeout(timeout)
                        reject(error)
                    }
                })

            } catch (error) {
                console.error(`Failed to send to ${relayUrl}:`, error)
                reject(error)
            }
        })
    }

    async waitForResponse(timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout waiting for DVM response (${timeoutMs}ms)`))
            }, timeoutMs)

            const checkResponse = () => {
                if (this.responses.length > 0) {
                    clearTimeout(timeout)
                    resolve(this.responses[this.responses.length - 1])
                } else {
                    setTimeout(checkResponse, 1000)
                }
            }

            checkResponse()
        })
    }

    async disconnect() {
        console.log('🔌 Disconnecting from relays...')

        // Clear pending events
        this.pendingEvents.clear()

        // Close connections
        Array.from(this.connections.values()).forEach(ws => {
            try {
                ws.close(1000, 'Client disconnecting')
            } catch (error) {
                console.warn('Error closing connection:', error)
            }
        })
        this.connections.clear()
        console.log('👋 Disconnected from all relays')
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2)

    if (args.includes('--help') || args.length === 0) {
        console.log(`
🔮 Relay Shadow DVM Test Client (Fixed Version)

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

  # Discovery recommendations
  node test-client.js --dvm-pubkey abc123... --request-type discover --use-case journalism
        `)
        process.exit(0)
    }

    const dvmPubkeyArg = args.indexOf('--dvm-pubkey')
    if (dvmPubkeyArg === -1 || !args[dvmPubkeyArg + 1]) {
        console.error('❌ --dvm-pubkey is required')
        process.exit(1)
    }

    const dvmPubkey = args[dvmPubkeyArg + 1]

    // Parse other arguments
    const requestType = args[args.indexOf('--request-type') + 1] || 'recommend'
    const threatLevel = args[args.indexOf('--threat-level') + 1] || 'medium'
    const maxResults = parseInt(args[args.indexOf('--max-results') + 1]) || 10
    const useCase = args[args.indexOf('--use-case') + 1] || 'social'
    const currentRelaysArg = args[args.indexOf('--current-relays') + 1]
    const currentRelays = currentRelaysArg ? currentRelaysArg.split(',').map(r => r.trim()) : []
    const timeout = parseInt(args[args.indexOf('--timeout') + 1]) || 30000

    const client = new DVMTestClient(dvmPubkey)

    try {
        // Connect to relays
        await client.connect()

        // Send request
        await client.sendRequest(requestType, {
            threatLevel,
            maxResults,
            useCase,
            currentRelays
        })

        // Wait for response
        console.log(`⏳ Waiting up to ${timeout / 1000}s for response...`)
        await client.waitForResponse(timeout)

        console.log('✅ Test completed successfully!')

    } catch (error) {
        console.error('❌ Test failed:', error.message)
        process.exit(1)
    } finally {
        await client.disconnect()
    }
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error)
}

export { DVMTestClient }