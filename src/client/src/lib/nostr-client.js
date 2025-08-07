import { generatePrivateKey, getPublicKey, finishEvent, validateEvent } from 'nostr-tools'

export class NostrClient {
    constructor(privateKey, dvmPublicKey) {
        this.privateKey = privateKey
        this.publicKey = getPublicKey(privateKey)
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
                    console.log(`  ✗ Failed to connect to ${relayUrl}:`, error.message)
                    reject(error)
                }

                ws.onmessage = (event) => {
                    this.handleRelayMessage(relayUrl, event.data)
                }

                ws.onclose = (event) => {
                    this.connections.delete(relayUrl)
                    console.log(`  ⚠ Disconnected from ${relayUrl}`, event.code)
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
                    break
                case 'EOSE':
                    console.log(`📄 End of stored events from ${relayUrl}`)
                    break
                case 'OK':
                    console.log(`✅ Event accepted by ${relayUrl}:`, subscriptionId)
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
                        dvmPubkey: event.pubkey
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

        // Sign the event
        const signedEvent = finishEvent(requestEvent, this.privateKey)

        // Validate before sending
        if (!validateEvent(signedEvent)) {
            throw new Error('Invalid event signature')
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

            const eventMessage = ['EVENT', event]
            ws.send(JSON.stringify(eventMessage))
            console.log(`  → Sent to ${relayUrl}`)
            resolve()
        })
    }

    async disconnect() {
        console.log('🔌 Disconnecting from relays...')

        // Close subscriptions
        for (const [subId, ws] of this.subscriptions) {
            Array.from(this.connections.values()).forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(['CLOSE', subId]))
                }
            })
        }
        this.subscriptions.clear()

        // Close connections
        Array.from(this.connections.values()).forEach(ws => {
            ws.close()
        })
        this.connections.clear()

        console.log('👋 Disconnected from all relays')
    }

    getConnectionStatus() {
        return {
            total: this.relays.length,
            connected: this.connections.size,
            relays: Array.from(this.connections.keys())
        }
    }
}