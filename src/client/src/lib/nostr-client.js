import { generatePrivateKey, getPublicKey, finishEvent, validateEvent } from 'nostr-tools'

export class NostrClient {
    constructor(privateKey, dvmPublicKey, signFunction = null, albyPublicKey = null) {
        // Handle different connection methods
        if (signFunction && albyPublicKey) {
            // Alby connection
            this.useAlby = true
            this.signFunction = signFunction
            this.publicKey = albyPublicKey
            this.privateKey = null
        } else {
            // Manual connection
            this.useAlby = false
            this.privateKey = privateKey
            this.publicKey = getPublicKey(privateKey)
            this.signFunction = null
        }

        this.dvmPublicKey = dvmPublicKey
        this.connections = new Map()
        this.subscriptions = new Map()
        this.onResponse = null
        this.onError = null

        // Default relays
        this.relays = [
            'wss://relay.damus.io',
            'wss://relay.snort.social',
            'wss://nos.lol',
        ]

        console.log('🔮 NostrClient initialized')
        console.log('📡 Client pubkey:', this.publicKey)
        console.log('🎯 DVM pubkey:', this.dvmPublicKey)
        console.log('🔐 Connection method:', this.useAlby ? 'Alby Wallet' : 'Manual Key')
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
                    ws.close()
                    reject(new Error(`Connection timeout: ${relayUrl}`))
                }, 15000) // Increased timeout to 15 seconds

                ws.onopen = () => {
                    clearTimeout(timeout)
                    this.connections.set(relayUrl, ws)
                    console.log(`  ✓ Connected to ${relayUrl}`)
                    resolve(ws)
                }

                ws.onerror = (error) => {
                    clearTimeout(timeout)
                    console.log(`  ✗ Failed to connect to ${relayUrl}:`, error.message || 'Unknown error')
                    reject(error)
                }

                ws.onmessage = (event) => {
                    this.handleMessage(relayUrl, event.data)
                }

                ws.onclose = (event) => {
                    this.connections.delete(relayUrl)
                    console.log(`  ⚠ Disconnected from ${relayUrl} (${event.code})`)
                }

            } catch (error) {
                reject(error)
            }
        })
    }

    handleMessage(relayUrl, message) {
        try {
            const parsed = JSON.parse(message)
            const [messageType, subscriptionId, event] = parsed

            switch (messageType) {
                case 'EVENT':
                    if (this.isDVMResponse(event)) {
                        console.log(`📨 Received DVM response from ${relayUrl}`)
                        this.handleDVMResponse(event)
                    }
                    break
                case 'NOTICE':
                    console.log(`📢 Notice from ${relayUrl}:`, subscriptionId)
                    if (this.onError) {
                        this.onError(new Error(`Relay notice: ${subscriptionId}`))
                    }
                    break
                case 'EOSE':
                    console.log(`📄 End of stored events from ${relayUrl}`)
                    break
                case 'OK':
                    const [, eventId, accepted, reason] = parsed
                    if (accepted) {
                        console.log(`✅ Event accepted by ${relayUrl}:`, eventId?.substring(0, 8))
                    } else {
                        console.log(`❌ Event rejected by ${relayUrl}:`, reason)
                        if (this.onError) {
                            this.onError(new Error(`Event rejected by ${relayUrl}: ${reason}`))
                        }
                    }
                    break
                case 'AUTH':
                    console.log(`🔐 Auth challenge from ${relayUrl}`)
                    // Handle AUTH if needed in the future
                    break
                default:
                    console.log(`❓ Unknown message type from ${relayUrl}:`, messageType)
                    break
            }
        } catch (error) {
            console.warn(`⚠ Invalid message from ${relayUrl}:`, error.message)
        }
    }

    isDVMResponse(event) {
        if (event.kind !== 6600) return false // Not a DVM response

        // Check if addressed to us
        const isForUs = event.tags.some(tag =>
            tag[0] === 'p' && tag[1] === this.publicKey
        )

        return isForUs
    }

    handleDVMResponse(event) {
        if (this.onResponse) {
            try {
                const responseData = JSON.parse(event.content)
                this.onResponse({
                    ...responseData,
                    _meta: {
                        eventId: event.id,
                        timestamp: event.created_at,
                        dvmPubkey: event.pubkey,
                        receivedAt: Date.now()
                    }
                })
            } catch (error) {
                console.error('Failed to parse DVM response:', error)
                if (this.onError) {
                    this.onError(new Error('Invalid DVM response format'))
                }
            }
        }
    }

    async subscribeToResponses() {
        const subscription = {
            kinds: [6600], // DVM response kind
            '#p': [this.publicKey], // Responses addressed to us
            since: Math.floor(Date.now() / 1000) - 300 // Last 5 minutes
        }

        const subscriptionId = `dvm-responses-${Date.now()}`
        this.subscriptions.set(subscriptionId, subscription)

        const subscribeMessage = ['REQ', subscriptionId, subscription]

        Array.from(this.connections.values()).forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(subscribeMessage))
            }
        })

        console.log('👂 Subscribed to DVM responses')
    }

    async sendRequest(requestData) {
        if (!this.isReady()) {
            throw new Error('Client not ready - not connected to any relays')
        }

        const { requestType, threatLevel, maxResults, useCase, context, currentRelays } = requestData

        const requestEvent = {
            kind: 5600, // DVM request kind
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['p', this.dvmPublicKey], // DVM public key
                ['param', 'request_type', requestType],
                ['param', 'threat_level', threatLevel || 'medium'],
                ['param', 'max_results', String(maxResults || 10)]
            ],
            content: context || `Request ${requestType} with threat level ${threatLevel}`,
            pubkey: this.publicKey
        }

        // Add optional parameters
        if (useCase) {
            requestEvent.tags.push(['param', 'use_case', useCase])
        }

        if (requestType === 'analyze' && currentRelays?.length > 0) {
            requestEvent.tags.push(['param', 'current_relays', currentRelays.join(',')])
        }

        // Add client info for better DVM responses
        requestEvent.tags.push(['client', 'relay-shadow-client', '1.0.0'])

        // Sign the event
        let signedEvent
        try {
            if (this.useAlby && this.signFunction) {
                // Use Alby for signing
                console.log('🔐 Signing with Alby...')
                signedEvent = await this.signFunction(requestEvent)
            } else {
                // Use manual signing
                signedEvent = finishEvent(requestEvent, this.privateKey)
            }

            // Validate before sending
            if (!validateEvent(signedEvent)) {
                throw new Error('Invalid event signature')
            }
        } catch (error) {
            console.error('Event signing failed:', error)
            throw new Error(`Failed to sign event: ${error.message}`)
        }

        // Send to all connected relays
        const publishPromises = Array.from(this.connections.entries()).map(([url, ws]) => {
            return this.publishEventToRelay(ws, signedEvent, url)
        })

        const results = await Promise.allSettled(publishPromises)
        const successful = results.filter(r => r.status === 'fulfilled').length

        console.log(`📤 Request sent to ${successful}/${this.connections.size} relays`)
        console.log(`🔍 Request ID: ${signedEvent.id}`)

        if (successful === 0) {
            throw new Error('Failed to send request to any relay')
        }

        return signedEvent
    }

    async publishEventToRelay(ws, event, relayUrl) {
        return new Promise((resolve, reject) => {
            if (ws.readyState !== WebSocket.OPEN) {
                reject(new Error(`Relay ${relayUrl} not connected`))
                return
            }

            try {
                const eventMessage = ['EVENT', event]
                ws.send(JSON.stringify(eventMessage))
                console.log(`  → Sent to ${relayUrl}`)

                // Set up a timeout for the OK response
                const timeout = setTimeout(() => {
                    console.log(`  ⏰ Timeout waiting for OK from ${relayUrl}`)
                    resolve() // Don't reject on timeout, just resolve
                }, 5000)

                // Listen for OK response (this is simplified - in production you'd track this better)
                const originalOnMessage = ws.onmessage
                ws.onmessage = (messageEvent) => {
                    // Call original handler first
                    if (originalOnMessage) {
                        originalOnMessage(messageEvent)
                    }

                    try {
                        const [messageType, eventId, accepted] = JSON.parse(messageEvent.data)
                        if (messageType === 'OK' && eventId === event.id) {
                            clearTimeout(timeout)
                            if (accepted) {
                                resolve()
                            } else {
                                reject(new Error(`Event rejected by ${relayUrl}`))
                            }
                        }
                    } catch (e) {
                        // Ignore parsing errors for other messages
                    }
                }

            } catch (error) {
                console.error(`Failed to send to ${relayUrl}:`, error)
                reject(error)
            }
        })
    }

    async disconnect() {
        console.log('🔌 Disconnecting from relays...')

        // Close subscriptions
        for (const [subId] of this.subscriptions) {
            Array.from(this.connections.values()).forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    try {
                        ws.send(JSON.stringify(['CLOSE', subId]))
                    } catch (error) {
                        console.warn('Error closing subscription:', error)
                    }
                }
            })
        }
        this.subscriptions.clear()

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

    getConnectionStatus() {
        const connectedRelays = Array.from(this.connections.keys())
        return {
            total: this.relays.length,
            connected: this.connections.size,
            relays: connectedRelays,
            method: this.useAlby ? 'Alby Wallet' : 'Manual Key',
            publicKey: this.publicKey
        }
    }

    // Helper method to check if client is ready
    isReady() {
        return this.connections.size > 0 && (this.privateKey || (this.useAlby && this.signFunction))
    }

    // Method to get relay performance stats
    getRelayStats() {
        const stats = {}
        for (const [url, ws] of this.connections) {
            stats[url] = {
                connected: ws.readyState === WebSocket.OPEN,
                readyState: ws.readyState,
                url: ws.url
            }
        }
        return stats
    }

    // Method to add additional relays
    async addRelay(relayUrl) {
        if (!this.relays.includes(relayUrl)) {
            this.relays.push(relayUrl)
            try {
                await this.connectToRelay(relayUrl)
                console.log(`✅ Added and connected to ${relayUrl}`)
                return true
            } catch (error) {
                console.error(`❌ Failed to connect to new relay ${relayUrl}:`, error)
                return false
            }
        }
        return false
    }

    // Method to remove relays
    removeRelay(relayUrl) {
        const ws = this.connections.get(relayUrl)
        if (ws) {
            ws.close()
            this.connections.delete(relayUrl)
        }
        this.relays = this.relays.filter(r => r !== relayUrl)
        console.log(`🗑️ Removed relay ${relayUrl}`)
    }

    // Method to reconnect to all relays
    async reconnectAll() {
        console.log('🔄 Reconnecting to all relays...')

        // Close existing connections
        Array.from(this.connections.values()).forEach(ws => {
            try {
                ws.close()
            } catch (error) {
                console.warn('Error closing connection during reconnect:', error)
            }
        })
        this.connections.clear()

        // Reconnect
        return await this.connect()
    }
}