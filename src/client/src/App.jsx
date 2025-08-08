import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Navigation from './components/Navigation'
import ConnectionPanel from './components/ConnectionPanel'
import RequestPanel from './components/RequestPanel'
import ResponsePanel from './components/ResponsePanel'
import { NostrClient } from './lib/nostr-client'
import { useLocalStorage } from './hooks/useLocalStorage'
import toast from 'react-hot-toast'

const App = () => {
  const [activeTab, setActiveTab] = useState('recommend')
  const [nostrClient, setNostrClient] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentRequest, setCurrentRequest] = useState(null)
  const [responses, setResponses] = useState([])
  const [dvmInfo, setDvmInfo] = useState(null)

  // Connection state - using localStorage for manual method only
  const [privateKey, setPrivateKey] = useLocalStorage('client-private-key', '')
  const [dvmPublicKey, setDvmPublicKey] = useLocalStorage('dvm-public-key', '')
  const [userPublicKey, setUserPublicKey] = useState('')

  // Theme state
  const [isDark, setIsDark] = useLocalStorage('dark-mode', true)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Auto-fetch DVM info on app load
  useEffect(() => {
    const fetchDvmInfo = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/dvm/info')
        if (response.ok) {
          const info = await response.json()
          setDvmInfo(info)

          // Auto-set DVM public key if not already set
          if (!dvmPublicKey && info.publicKey) {
            setDvmPublicKey(info.publicKey)
          }
        }
      } catch (error) {
        console.log('DVM server not available yet')
      }
    }

    fetchDvmInfo()
  }, [])

  const handleConnect = async (clientPrivateKey, dvmPubkey, signFunction = null, albyPublicKey = null) => {
    try {
      setIsConnected(false)
      setCurrentRequest(null)

      let client

      if (signFunction && albyPublicKey) {
        // Alby connection - FIXED: Constructor arguments were in wrong order
        client = new NostrClient(dvmPubkey, {
          useAlby: true,
          signFunction: signFunction,
          privateKey: null, // Alby handles signing
          relays: ['wss://relay.damus.io', 'wss://relay.snort.social', 'wss://nos.lol', 'wss://relay.nostr.band']
        })

        // For Alby, we need to set the public key manually since we're not generating a private key
        client.publicKey = albyPublicKey

        setUserPublicKey(albyPublicKey)
        toast.success('Connecting via Alby wallet...', { duration: 2000 })
      } else {
        // Manual connection - FIXED: Constructor signature
        if (!clientPrivateKey || !dvmPubkey) {
          throw new Error('Private key and DVM public key are required')
        }

        client = new NostrClient(dvmPubkey, {
          useAlby: false,
          signFunction: null,
          privateKey: clientPrivateKey,
          relays: ['wss://relay.damus.io', 'wss://relay.snort.social', 'wss://nos.lol', 'wss://relay.nostr.band']
        })

        setUserPublicKey(client.publicKey)
        setPrivateKey(clientPrivateKey)
      }

      // CRITICAL: Validate that dvmPublicKey was set correctly
      if (!client.dvmPublicKey) {
        throw new Error('DVM public key was not set correctly')
      }

      console.log('🔧 Client Debug Info:')
      console.log('  - DVM Public Key:', client.dvmPublicKey)
      console.log('  - Client Public Key:', client.publicKey)
      console.log('  - Use Alby:', client.useAlby)

      // Set up event handlers before connecting
      client.onResponse = (response) => {
        console.log('📨 Received DVM response:', response)
        setResponses(prev => [response, ...prev])
        setCurrentRequest(null)

        // Show success toast for response
        if (response.type === 'relay_recommendations') {
          const count = response.recommendations?.primary?.length || 0
          toast.success(`Received ${count} relay recommendations!`)
        } else if (response.type === 'error') {
          toast.error(`DVM Error: ${response.error}`)
        } else {
          toast.success('Response received from DVM!')
        }
      }

      client.onError = (error) => {
        console.error('Client error:', error)
        toast.error(`Connection error: ${error.message}`)
        setCurrentRequest(null)
      }

      // Connect to relays
      const connected = await client.connect()

      if (connected > 0) {
        setNostrClient(client)
        setIsConnected(true)
        setDvmPublicKey(dvmPubkey)
        console.log('✅ Successfully connected to DVM')
      } else {
        throw new Error('Failed to connect to any relays')
      }

    } catch (error) {
      console.error('Connection failed:', error)
      setIsConnected(false)
      setNostrClient(null)
      throw error
    }
  }

  const handleDisconnect = async () => {
    try {
      if (nostrClient) {
        await nostrClient.disconnect()
      }
      setNostrClient(null)
      setIsConnected(false)
      setCurrentRequest(null)
      setUserPublicKey('')
      console.log('🔌 Disconnected from DVM')
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Error during disconnect')
    }
  }

  const handleSendRequest = async (requestData) => {
    if (!nostrClient) {
      toast.error('Not connected to DVM')
      return
    }

    if (!nostrClient.isReady()) {
      toast.error('Client not ready - please reconnect')
      return
    }

    try {
      console.log('📤 Sending request:', requestData)

      // Clear any previous request
      setCurrentRequest(null)

      // Send the request
      const request = await nostrClient.sendRequest(requestData)
      setCurrentRequest(request)

      // Show different toasts based on request type
      const requestTypes = {
        recommend: 'Finding the best relays for your threat level...',
        analyze: 'Analyzing your current relay setup...',
        discover: 'Discovering new relays with quality content...',
        health: 'Checking network health status...'
      }

      toast.success(requestTypes[requestData.requestType] || 'Processing your request...', {
        duration: 3000
      })

      // Set a timeout to clear the request if no response comes
      setTimeout(() => {
        if (currentRequest && currentRequest.id === request.id) {
          setCurrentRequest(null)
          toast.error('Request timeout - no response received')
        }
      }, 30000) // 30 second timeout

    } catch (error) {
      console.error('Request failed:', error)
      toast.error(`Request failed: ${error.message}`)
      setCurrentRequest(null)
      throw error
    }
  }

  const handleDvmInfoUpdate = (info) => {
    setDvmInfo(info)
  }

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <div className="relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-pink-400/30 to-rose-400/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-400/30 to-blue-400/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-gradient-to-r from-violet-400/30 to-purple-400/30 rounded-full blur-3xl animate-blob animation-delay-4000" />

        {/* Main content */}
        <div className="relative z-10">
          {/* Header */}
          <Header isDark={isDark} onToggleTheme={toggleTheme} />

          {/* Main container */}
          <div className="container mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={`backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-dark-800/50 border border-dark-700' : 'bg-white/50 border border-gray-200'
                }`}
            >
              <ConnectionPanel
                isConnected={isConnected}
                privateKey={privateKey}
                dvmPublicKey={dvmPublicKey}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onDvmInfoUpdate={handleDvmInfoUpdate}
                isDark={isDark}
              />

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
                  <RequestPanel
                    activeTab={activeTab}
                    onSendRequest={handleSendRequest}
                    isConnected={isConnected}
                    currentRequest={currentRequest}
                    isDark={isDark}
                  />

                  <ResponsePanel
                    responses={responses}
                    currentRequest={currentRequest}
                    activeTab={activeTab}
                    isDark={isDark}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Footer with connection info */}
            {dvmInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={`mt-6 p-4 rounded-xl text-center text-sm ${isDark ? 'bg-dark-800/30 text-gray-400' : 'bg-white/30 text-gray-600'
                  }`}
              >
                <p>
                  Connected to Relay Shadow DVM • {dvmInfo.relays?.length || 0} relays •
                  {dvmInfo.supportedRequests?.length || 0} services available
                </p>
                <p className="text-xs mt-1 font-mono">
                  DVM: {dvmInfo.publicKey?.substring(0, 16)}...
                </p>
              </motion.div>
            )}

            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className={`mt-4 p-3 rounded-lg text-xs font-mono ${isDark ? 'bg-dark-800/50 text-gray-400' : 'bg-white/50 text-gray-600'
                  }`}
              >
                <div>Connected: {isConnected.toString()}</div>
                <div>Client Ready: {nostrClient?.isReady()?.toString() || 'false'}</div>
                <div>Active Connections: {nostrClient?.connections?.size || 0}</div>
                <div>Current Request: {currentRequest?.id?.substring(0, 8) || 'none'}</div>
                <div>Total Responses: {responses.length}</div>
              </motion.div>
            )}
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
            borderRadius: '12px',
            boxShadow: isDark
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: isDark ? '#1e293b' : '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: isDark ? '#1e293b' : '#ffffff',
            },
          },
        }}
      />
    </div>
  )
}

export default App