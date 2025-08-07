// src/client/src/hooks/useAlby.js
import { useState, useEffect } from 'react'
import { getPublicKey } from 'nostr-tools'

export function useAlby() {
    const [isConnected, setIsConnected] = useState(false)
    const [publicKey, setPublicKey] = useState('')
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState(null)

    // Check if Alby is available
    const isAlbyAvailable = () => {
        return typeof window !== 'undefined' && window.webln && window.nostr
    }

    // Check existing connection on mount
    useEffect(() => {
        const checkExistingConnection = async () => {
            if (isAlbyAvailable()) {
                try {
                    // Check if already enabled
                    const pubkey = await window.nostr.getPublicKey()
                    if (pubkey) {
                        setPublicKey(pubkey)
                        setIsConnected(true)
                    }
                } catch (error) {
                    // Not connected yet, that's fine
                    setError(null)
                }
            }
        }

        checkExistingConnection()
    }, [])

    const connectAlby = async () => {
        if (!isAlbyAvailable()) {
            setError('Alby extension not found. Please install Alby browser extension.')
            return false
        }

        setIsConnecting(true)
        setError(null)

        try {
            // Enable WebLN for payments (optional)
            if (window.webln) {
                await window.webln.enable()
            }

            // Enable Nostr for signing
            await window.nostr.enable()

            // Get public key
            const pubkey = await window.nostr.getPublicKey()

            setPublicKey(pubkey)
            setIsConnected(true)
            setIsConnecting(false)

            return { publicKey: pubkey }
        } catch (error) {
            console.error('Alby connection failed:', error)
            setError(error.message || 'Failed to connect to Alby')
            setIsConnecting(false)
            return false
        }
    }

    const signEvent = async (event) => {
        if (!isConnected || !window.nostr) {
            throw new Error('Alby not connected')
        }

        try {
            return await window.nostr.signEvent(event)
        } catch (error) {
            console.error('Event signing failed:', error)
            throw new Error('Failed to sign event with Alby')
        }
    }

    const disconnect = () => {
        setIsConnected(false)
        setPublicKey('')
        setError(null)
    }

    const getRelays = async () => {
        if (!isConnected || !window.nostr.getRelays) {
            return []
        }

        try {
            const relays = await window.nostr.getRelays()
            return Object.keys(relays)
        } catch (error) {
            console.error('Failed to get relays:', error)
            return []
        }
    }

    return {
        isConnected,
        publicKey,
        isConnecting,
        error,
        isAlbyAvailable: isAlbyAvailable(),
        connectAlby,
        signEvent,
        disconnect,
        getRelays
    }
}