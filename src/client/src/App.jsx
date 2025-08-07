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
      let client

      if (signFunction && albyPublicKey) {
        // Alby connection
        client = new NostrClient(null, dvmPubkey, signFunction, albyPublicKey)
        setUserPublicKey(albyPublicKey)
        toast.success('Connecting via Alby wallet...', { duration: 2000 })
      } else {
        // Manual connection
        client = new NostrClient(clientPrivateKey, dvmPubkey)
        setUserPublicKey(client.publicKey)
        setPrivateKey(clientPrivateKey)
      }

      await client.connect()

      client.onResponse = (response) => {
        setResponses(prev => [response, ...prev])
        setCurrentRequest(null)

        // Show success toast for response
        if (response.type === 'relay_recommendations') {
          toast.success(`Received ${response.recommendations?.primary?.length || 0} recommendations!`)
        } else if (response.type === 'error') {
          toast.error(`DVM Error: ${response.error}`)
        } else {
          toast.success('Response received from DVM!')
        }
      }

      client.onError = (error) => {
        toast.error(`Connection error: ${error.message}`)
      }

      setNostrClient(client)
      setIsConnected(true)
      setDvmPublicKey(dvmPubkey)

    } catch (error) {
      console.error('Connection failed:', error)
      throw error
    }
  }

  const handleDisconnect = async () => {
    if (nostrClient) {
      await nostrClient.disconnect()
      setNostrClient(null)
      setIsConnected(false)
      setCurrentRequest(null)
      setUserPublicKey('')
    }
  }

  const handleSendRequest = async (requestData) => {
    if (!nostrClient) {
      toast.error('Not connected to DVM')
      return
    }

    try {
      const request = await nostrClient.sendRequest(requestData)
      setCurrentRequest(request)

      // Show different toasts based on request type
      const requestTypes = {
        recommend: 'Finding the best relays for your threat level...',
        analyze: 'Analyzing your current relay setup...',
        discover: 'Discovering new relays with quality content...',
        health: 'Checking network health status...'
      }

      toast.success(requestTypes[requestData.requestType] || 'Processing your request...')

    } catch (error) {
      toast.error(`Request failed: ${error.message}`)
      setCurrentRequest(null)
      throw error
    }
  }

  const handleDvmInfoUpdate = (info) => {
    setDvmInfo(info)
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="relative">
        {/* Enhanced animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <Header
            isDark={isDark}
            setIsDark={setIsDark}
            isConnected={isConnected}
            userPublicKey={userPublicKey}
            dvmInfo={dvmInfo}
          />

          <div className="px-6 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm ${isDark ? 'bg-dark-800/50 border border-dark-700' : 'bg-white/50 border border-gray-200'
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