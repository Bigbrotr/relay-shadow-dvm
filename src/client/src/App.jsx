import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Navigation from './components/Navigation'
import ConnectionPanel from './components/ConnectionPanel'
import RequestPanel from './components/RequestPanel'
import ResponsePanel from './components/ResponsePanel'
import HistoryPanel from './components/HistoryPanel'
import { NostrClient } from './lib/nostr-client'
import { useLocalStorage } from './hooks/useLocalStorage'

const App = () => {
    const [activeTab, setActiveTab] = useState('recommend')
    const [nostrClient, setNostrClient] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const [currentRequest, setCurrentRequest] = useState(null)
    const [responses, setResponses] = useState([])
    const [requestHistory, setRequestHistory] = useLocalStorage('request-history', [])

    // Connection state
    const [privateKey, setPrivateKey] = useLocalStorage('client-private-key', '')
    const [dvmPublicKey, setDvmPublicKey] = useLocalStorage('dvm-public-key', '')

    // Theme state
    const [isDark, setIsDark] = useLocalStorage('dark-mode', true)

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDark])

    const handleConnect = async (clientPrivateKey, dvmPubkey) => {
        try {
            const client = new NostrClient(clientPrivateKey, dvmPubkey)
            await client.connect()

            // Set up response handler
            client.onResponse = (response) => {
                setResponses(prev => [response, ...prev])
                setCurrentRequest(null)
            }

            setNostrClient(client)
            setIsConnected(true)
            setPrivateKey(clientPrivateKey)
            setDvmPublicKey(dvmPubkey)
        } catch (error) {
            throw error
        }
    }

    const handleDisconnect = async () => {
        if (nostrClient) {
            await nostrClient.disconnect()
            setNostrClient(null)
            setIsConnected(false)
            setCurrentRequest(null)
        }
    }

    const handleSendRequest = async (requestData) => {
        if (!nostrClient) return

        try {
            const request = await nostrClient.sendRequest(requestData)
            setCurrentRequest(request)

            // Add to history
            const historyItem = {
                id: request.id,
                timestamp: Date.now(),
                type: requestData.requestType,
                params: requestData,
                status: 'sent'
            }
            setRequestHistory(prev => [historyItem, ...prev.slice(0, 19)]) // Keep last 20

        } catch (error) {
            throw error
        }
    }

    const clearHistory = () => {
        setRequestHistory([])
        setResponses([])
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-900 text-white' : 'bg-gray-50 text-gray-900'
            }`}>
            <div className="relative">
                {/* Animated background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                </div>

                {/* Main content */}
                <div className="relative z-10 max-w-7xl mx-auto">
                    <Header
                        isDark={isDark}
                        setIsDark={setIsDark}
                        isConnected={isConnected}
                    />

                    <div className="px-6 pb-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className={`rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm ${isDark ? 'bg-dark-800/50 border border-dark-700' : 'bg-white/50 border border-gray-200'
                                }`}
                        >
                            {/* Connection Panel */}
                            <ConnectionPanel
                                isConnected={isConnected}
                                privateKey={privateKey}
                                dvmPublicKey={dvmPublicKey}
                                onConnect={handleConnect}
                                onDisconnect={handleDisconnect}
                                isDark={isDark}
                            />

                            {/* Navigation */}
                            <Navigation
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                isDark={isDark}
                                disabled={!isConnected}
                            />

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-6"
                                >
                                    {/* Request Panel */}
                                    <RequestPanel
                                        activeTab={activeTab}
                                        onSendRequest={handleSendRequest}
                                        isConnected={isConnected}
                                        currentRequest={currentRequest}
                                        isDark={isDark}
                                    />

                                    {/* Response Panel */}
                                    <ResponsePanel
                                        responses={responses}
                                        currentRequest={currentRequest}
                                        activeTab={activeTab}
                                        isDark={isDark}
                                    />

                                    {/* History Panel */}
                                    <HistoryPanel
                                        requestHistory={requestHistory}
                                        responses={responses}
                                        onClearHistory={clearHistory}
                                        isDark={isDark}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </div>
            </div>

            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: isDark ? '#1e293b' : '#ffffff',
                        color: isDark ? '#ffffff' : '#000000',
                        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    },
                }}
            />
        </div>
    )
}

export default App