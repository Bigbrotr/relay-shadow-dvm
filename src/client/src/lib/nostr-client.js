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
            'wss://relay.nostr.band'
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
                }, 10000)

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
                    this.handleRelayMessage(relayUrl, event.data)
                }

                ws.onclose = (event) => {
                    this.connections.delete(relayUrl)
                    console.log(`  ⚠ Disconnected from ${relayUrl}`, event.code)

                    // Notify error handler if connection is unexpectedly closed
                    if (this.onError && event.code !== 1000) {
                        this.onError(new Error(`Lost connection to ${relayUrl}`))
                    }
                }

            } catch (error) {
                reject(error)
            }
        })
    }

    handleRelayMessage(relayUrl, message) {
        try {
            const [messageType, subscriptionId, event] = JSON.parse(message)

            switch (messageType) {
                case 'EVENT':
                    if (this.isDVMResponse(event)) {
                        console.log('🎉 Received DVM response from', relayUrl)
                        this.handleDVMResponse(event)
                    }
                    break
                case 'NOTICE':
                    console.log(`📢 Notice from ${relayUrl}:`, subscriptionId)
                    // Some notices might be important for debugging
                    if (subscriptionId && subscriptionId.includes('error')) {
                        this.onError?.(new Error(`Relay notice: ${subscriptionId}`))
                    }
                    break
                case 'EOSE':
                    console.log(`📄 End of stored events from ${relayUrl}`)
                    break
                case 'OK':
                    const [, eventId, accepted, reason] = JSON.parse(message)
                    if (accepted) {
                        console.log(`✅ Event accepted by ${relayUrl}:`, eventId?.substring(0, 8))
                    } else {
                        console.log(`❌ Event rejected by ${relayUrl}:`, reason)
                        this.onError?.(new Error(`Event rejected by ${relayUrl}: ${reason}`))
                    }
                    break
                case 'AUTH':
                    console.log(`🔐 Auth challenge from ${relayUrl}`)
                    // Handle AUTH if needed
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
                resolve()
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
}