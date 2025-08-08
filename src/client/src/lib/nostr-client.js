// Fixed NostrClient with improved send/receive for DVM requests
// src/client/src/lib/nostr-client.js

import { generatePrivateKey, getPublicKey, finishEvent, validateEvent } from 'nostr-tools'

export class NostrClient {
    constructor(dvmPublicKey, options = {}) {
        this.dvmPublicKey = dvmPublicKey
        this.useAlby = options.useAlby || false
        this.signFunction = options.signFunction || null

        // Generate or use provided keys
        this.privateKey = options.privateKey || generatePrivateKey()
        this.publicKey = getPublicKey(this.privateKey)

        // Connection management
        this.connections = new Map()
        this.subscriptions = new Map()
        this.pendingRequests = new Map() // Track pending requests for timeout handling
        this.eventCallbacks = new Map() // Track callbacks for specific events

        // Event handlers
        this.onResponse = options.onResponse || null
        this.onError = options.onError || null
        this.onConnectionChange = options.onConnectionChange || null

        // Default relays
        this.relays = options.relays || [
            'wss://relay.damus.io',
            'wss://relay.snort.social',
            'wss://nos.lol',
            'wss://relay.nostr.band'
        ]

        console.log(`🔧 NostrClient initialized`)
        console.log(`📡 Client pubkey: ${this.publicKey}`)
        console.log(`🎯 Target DVM: ${this.dvmPublicKey}`)
        console.log(`🔐 Auth method: ${this.useAlby ? 'Alby' : 'Private Key'}`)
    }

    isReady() {
        return this.connections.size > 0 &&
            Array.from(this.connections.values()).some(ws => ws.readyState === WebSocket.OPEN)
    }

    getConnectionStatus() {
        const total = this.connections.size
        const connected = Array.from(this.connections.values())
            .filter(ws => ws.readyState === WebSocket.OPEN).length
        return { total, connected }
    }

    async connect() {
        console.log(`🔗 Connecting to ${this.relays.length} relays...`)

        const connectionPromises = this.relays.map(relay =>
            this.connectToRelay(relay).catch(error => {
                console.warn(`Failed to connect to ${relay}:`, error.message)
                return null
            })
        )

        const results = await Promise.allSettled(connectionPromises)
        const connected = results.filter(r => r.status === 'fulfilled' && r.value).length

        if (connected === 0) {
            throw new Error('Failed to connect to any relays')
        }

        console.log(`✅ Connected to ${connected}/${this.relays.length} relays`)

        // Subscribe to DVM responses
        await this.subscribeToDVMResponses()

        return connected
    }

    async connectToRelay(relayUrl) {
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(relayUrl)

                const timeout = setTimeout(() => {
                    ws.close()
                    reject(new Error(`Connection timeout to ${relayUrl}`))
                }, 10000)

                ws.onopen = () => {
                    clearTimeout(timeout)
                    console.log(`🟢 Connected to ${relayUrl}`)
                    this.connections.set(relayUrl, ws)

                    if (this.onConnectionChange) {
                        this.onConnectionChange(this.getConnectionStatus())
                    }

                    resolve(ws)
                }

                ws.onerror = (error) => {
                    clearTimeout(timeout)
                    console.error(`🔴 Connection error to ${relayUrl}:`, error)
                    reject(new Error(`Failed to connect to ${relayUrl}`))
                }

                ws.onmessage = (event) => {
                    this.handleMessage(relayUrl, event.data)
                }

                ws.onclose = (event) => {
                    console.log(`🔌 Disconnected from ${relayUrl} (code: ${event.code})`)
                    this.connections.delete(relayUrl)

                    if (this.onConnectionChange) {
                        this.onConnectionChange(this.getConnectionStatus())
                    }

                    // Attempt reconnection after delay if not intentional close
                    if (event.code !== 1000 && event.code !== 1001) {
                        setTimeout(() => {
                            this.connectToRelay(relayUrl).catch(() => {
                                console.log(`Failed to reconnect to ${relayUrl}`)
                            })
                        }, 5000)
                    }
                }

            } catch (error) {
                reject(error)
            }
        })
    }

    handleMessage(relayUrl, message) {
        try {
            const parsed = JSON.parse(message)

            // Handle different message array lengths
            if (!Array.isArray(parsed) || parsed.length < 2) {
                console.warn(`Invalid message format from ${relayUrl}:`, parsed)
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
                    this.handleNoticeMessage(relayUrl, args)
                    break
                case 'EOSE':
                    this.handleEoseMessage(relayUrl, args)
                    break
                case 'AUTH':
                    this.handleAuthMessage(relayUrl, args)
                    break
                case 'CLOSED':
                    this.handleClosedMessage(relayUrl, args)
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
            this.handleDVMResponse(event)
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

            // Resolve any pending requests for this event
            if (this.eventCallbacks.has(eventId)) {
                const callback = this.eventCallbacks.get(eventId)
                callback.resolve({ relayUrl, accepted: true })
                this.eventCallbacks.delete(eventId)
            }
        } else {
            console.log(`❌ Event rejected by ${relayUrl}: ${reason || 'Unknown reason'}`)

            // Reject any pending requests for this event
            if (this.eventCallbacks.has(eventId)) {
                const callback = this.eventCallbacks.get(eventId)
                callback.reject(new Error(`Event rejected by ${relayUrl}: ${reason}`))
                this.eventCallbacks.delete(eventId)
            }

            if (this.onError) {
                this.onError(new Error(`Event rejected by ${relayUrl}: ${reason}`))
            }
        }
    }

    handleNoticeMessage(relayUrl, args) {
        const [notice] = args
        console.log(`📢 Notice from ${relayUrl}: ${notice}`)

        if (this.onError) {
            this.onError(new Error(`Relay notice from ${relayUrl}: ${notice}`))
        }
    }

    handleEoseMessage(relayUrl, args) {
        const [subscriptionId] = args
        console.log(`📄 End of stored events from ${relayUrl} for subscription ${subscriptionId}`)
    }

    handleAuthMessage(relayUrl, args) {
        const [challenge] = args
        console.log(`🔐 Auth challenge from ${relayUrl}: ${challenge}`)
        // TODO: Implement AUTH handling if needed
    }

    handleClosedMessage(relayUrl, args) {
        const [subscriptionId, reason] = args
        console.log(`🚫 Subscription closed by ${relayUrl}: ${subscriptionId} - ${reason}`)
    }

    isDVMResponse(event) {
        if (!event || event.kind !== 5601) return false

        // Check if this is a response to our DVM
        const targetTag = event.tags.find(tag => tag[0] === 'p' && tag[1] === this.publicKey)
        return !!targetTag
    }

    handleDVMResponse(event) {
        try {
            const response = {
                id: event.id,
                timestamp: event.created_at,
                content: event.content,
                tags: event.tags,
                raw: event
            }

            // Parse response type and data from tags
            const responseTypeTag = event.tags.find(tag => tag[0] === 'response_type')
            if (responseTypeTag) {
                response.type = responseTypeTag[1]
            }

            // Extract structured data from content
            try {
                const parsedContent = JSON.parse(event.content)
                response.data = parsedContent
            } catch {
                // Content is not JSON, keep as string
                response.data = event.content
            }

            console.log('📨 Parsed DVM response:', response.type || 'unknown')

            if (this.onResponse) {
                this.onResponse(response)
            }

        } catch (error) {
            console.error('Error handling DVM response:', error)
            if (this.onError) {
                this.onError(error)
            }
        }
    }

    async subscribeToDVMResponses() {
        if (!this.isReady()) {
            throw new Error('Client not ready')
        }

        const subscriptionId = 'dvm-responses-' + Math.random().toString(36).substring(7)

        const subscription = [
            'REQ',
            subscriptionId,
            {
                kinds: [5601], // DVM response kind
                '#p': [this.publicKey], // Responses to our public key
                since: Math.floor(Date.now() / 1000) - 60 // Last minute
            }
        ]

        let subscribed = 0
        for (const [url, ws] of this.connections.entries()) {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify(subscription))
                    subscribed++
                    console.log(`📡 Subscribed to DVM responses on ${url}`)
                } catch (error) {
                    console.error(`Failed to subscribe on ${url}:`, error)
                }
            }
        }

        console.log(`👂 Subscribed to DVM responses on ${subscribed} relays`)
        return subscribed > 0
    }

    async sendRequest(requestData) {
        if (!this.isReady()) {
            throw new Error('Client not ready - not connected to any relays')
        }

        const { requestType, threatLevel, maxResults, useCase, context, currentRelays } = requestData

        // Build request event - FIXED: Added missing pubkey property
        const requestEvent = {
            kind: 5600, // DVM request kind
            created_at: Math.floor(Date.now() / 1000),
            pubkey: this.publicKey, // ← This was missing and causing the error!
            tags: [
                ['p', this.dvmPublicKey], // DVM public key
                ['param', 'request_type', requestType],
                ['param', 'threat_level', threatLevel || 'medium'],
                ['param', 'max_results', String(maxResults || 10)]
            ],
            content: context || `Request ${requestType} with threat level ${threatLevel}`,
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

        // Validate event before signing
        console.log('🔍 Event validation before signing:')
        const requiredProps = ['kind', 'created_at', 'pubkey', 'tags', 'content']
        const missingProps = requiredProps.filter(prop =>
            requestEvent[prop] === undefined || requestEvent[prop] === null
        )

        if (missingProps.length > 0) {
            console.error('❌ Missing required properties:', missingProps)
            throw new Error(`Event missing required properties: ${missingProps.join(', ')}`)
        }

        // Check pubkey format (should be 64 character hex)
        if (!/^[a-f0-9]{64}$/i.test(requestEvent.pubkey)) {
            console.error('❌ Invalid pubkey format:', requestEvent.pubkey)
            throw new Error('Event pubkey should be 64 character hex string')
        }

        console.log('✅ Event validation passed')

        // Sign the event
        let signedEvent
        try {
            if (this.useAlby && this.signFunction) {
                console.log('🔐 Signing with Alby...')
                signedEvent = await this.signFunction(requestEvent)
            } else {
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

        // Send to all connected relays with improved error handling
        const publishPromises = Array.from(this.connections.entries()).map(([url, ws]) => {
            return this.publishEventToRelay(ws, signedEvent, url)
        })

        const results = await Promise.allSettled(publishPromises)
        const successful = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected')

        console.log(`📤 Request sent to ${successful}/${this.connections.size} relays`)
        console.log(`🔍 Request ID: ${signedEvent.id}`)

        // Log any failures
        if (failed.length > 0) {
            console.warn(`⚠️ Failed to send to ${failed.length} relays:`)
            failed.forEach((result, index) => {
                const relayUrl = Array.from(this.connections.keys())[index]
                console.warn(`  - ${relayUrl}: ${result.reason?.message}`)
            })
        }

        if (successful === 0) {
            throw new Error('Failed to send request to any relay')
        }

        return signedEvent
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

                // Set up callback for OK response
                const timeout = setTimeout(() => {
                    this.eventCallbacks.delete(event.id)
                    console.log(`  ⏰ Timeout waiting for OK from ${relayUrl}`)
                    resolve() // Don't reject on timeout, just resolve
                }, 10000)

                // Store callback for this event
                this.eventCallbacks.set(event.id, {
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

    async disconnect() {
        console.log('🔌 Disconnecting from all relays...')

        for (const [url, ws] of this.connections.entries()) {
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(1000, 'Client disconnect')
                }
            } catch (error) {
                console.warn(`Error closing connection to ${url}:`, error)
            }
        }

        this.connections.clear()
        this.subscriptions.clear()
        this.pendingRequests.clear()
        this.eventCallbacks.clear()

        if (this.onConnectionChange) {
            this.onConnectionChange(this.getConnectionStatus())
        }

        console.log('🔌 Disconnected from all relays')
    }
}