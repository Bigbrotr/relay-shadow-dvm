import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Link, Unlink, Copy, Eye, EyeOff, RefreshCw, Wallet, Zap, ExternalLink, Loader2 } from 'lucide-react'
import { generatePrivateKey, getPublicKey } from 'nostr-tools'
import { useAlby } from '../hooks/useAlby'
import toast from 'react-hot-toast'

const ConnectionPanel = ({ isConnected, privateKey, dvmPublicKey, onConnect, onDisconnect, isDark, onDvmInfoUpdate }) => {
    const [localPrivateKey, setLocalPrivateKey] = useState(privateKey)
    const [localDvmPublicKey, setLocalDvmPublicKey] = useState(dvmPublicKey)
    const [showPrivateKey, setShowPrivateKey] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionMethod, setConnectionMethod] = useState('alby') // 'alby' or 'manual'
    const [isDvmInfoLoading, setIsDvmInfoLoading] = useState(false)

    // Alby integration
    const {
        isConnected: isAlbyConnected,
        publicKey: albyPublicKey,
        isConnecting: isAlbyConnecting,
        error: albyError,
        isAlbyAvailable,
        connectAlby,
        signEvent,
        disconnect: disconnectAlby,
        getRelays: getAlbyRelays
    } = useAlby()

    // Fetch DVM info from server
    const fetchDvmInfo = async () => {
        setIsDvmInfoLoading(true)
        try {
            const response = await fetch('http://localhost:3001/api/dvm/info')
            if (response.ok) {
                const dvmInfo = await response.json()
                setLocalDvmPublicKey(dvmInfo.publicKey)
                onDvmInfoUpdate?.(dvmInfo)
                toast.success('DVM info loaded from server!')
                return dvmInfo
            } else {
                throw new Error('DVM server not responding')
            }
        } catch (error) {
            console.warn('Could not fetch DVM info:', error.message)
            toast.error('Could not connect to DVM server. Enter DVM public key manually.')
            return null
        } finally {
            setIsDvmInfoLoading(false)
        }
    }

    // Auto-fetch DVM info on mount
    useEffect(() => {
        if (!localDvmPublicKey) {
            fetchDvmInfo()
        }
    }, [])

    const handleGenerateKey = () => {
        const newKey = generatePrivateKey()
        setLocalPrivateKey(newKey)
        toast.success('New private key generated!')
    }

    const handleCopyPublicKey = () => {
        const pubkey = connectionMethod === 'alby' ? albyPublicKey :
            localPrivateKey ? getPublicKey(localPrivateKey) : ''

        if (pubkey) {
            navigator.clipboard.writeText(pubkey)
            toast.success('Public key copied to clipboard!')
        }
    }

    const handleAlbyConnect = async () => {
        setIsConnecting(true)
        try {
            const result = await connectAlby()
            if (result) {
                // Get user's relays from Alby if available
                try {
                    const relays = await getAlbyRelays()
                    console.log('User relays from Alby:', relays)
                } catch (e) {
                    console.log('Could not get relays from Alby')
                }
            }
        } catch (error) {
            console.error('Alby connection failed:', error)
        } finally {
            setIsConnecting(false)
        }
    }

    const handleConnect = async () => {
        if (connectionMethod === 'alby') {
            if (!isAlbyConnected) {
                toast.error('Please connect to Alby first')
                return
            }
            if (!localDvmPublicKey) {
                toast.error('DVM public key is required')
                return
            }

            setIsConnecting(true)
            try {
                await onConnect(null, localDvmPublicKey, signEvent, albyPublicKey)
                toast.success('Successfully connected via Alby!')
            } catch (error) {
                toast.error(`Connection failed: ${error.message}`)
            } finally {
                setIsConnecting(false)
            }
        } else {
            // Manual connection
            if (!localPrivateKey || !localDvmPublicKey) {
                toast.error('Please provide both private key and DVM public key')
                return
            }

            setIsConnecting(true)
            try {
                await onConnect(localPrivateKey, localDvmPublicKey)
                toast.success('Successfully connected!')
            } catch (error) {
                toast.error(`Connection failed: ${error.message}`)
            } finally {
                setIsConnecting(false)
            }
        }
    }

    const handleDisconnect = async () => {
        await onDisconnect()
        if (connectionMethod === 'alby') {
            disconnectAlby()
        }
        toast.success('Disconnected from DVM')
    }

    const currentPublicKey = connectionMethod === 'alby' ? albyPublicKey :
        localPrivateKey ? getPublicKey(localPrivateKey) : ''

    return (
        <div className={`p-6 border-b ${isDark ? 'border-dark-700 bg-dark-800/30' : 'border-gray-200 bg-gray-50/30'}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-600'}`}>
                        <Key className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Client Configuration</h3>
                </div>

                {isConnected && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center space-x-2 text-green-500"
                    >
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">Connected</span>
                        {connectionMethod === 'alby' && (
                            <Wallet className="w-4 h-4 ml-1" />
                        )}
                    </motion.div>
                )}
            </div>

            {/* Connection Method Selection */}
            <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Connection Method
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={() => setConnectionMethod('alby')}
                        disabled={isConnected}
                        className={`relative flex items-center p-4 rounded-xl border-2 transition-all ${connectionMethod === 'alby'
                            ? isDark
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-primary-500 bg-primary-50'
                            : isDark
                                ? 'border-dark-600 hover:border-dark-500 bg-dark-800/50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            } ${isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${connectionMethod === 'alby' && isAlbyAvailable
                                ? 'bg-orange-100 text-orange-600'
                                : isDark ? 'bg-dark-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                                }`}>
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-sm flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                                    <span>Alby Wallet</span>
                                    {!isAlbyAvailable && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                            Not Available
                                        </span>
                                    )}
                                    {isAlbyConnected && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                            Connected
                                        </span>
                                    )}
                                </div>
                                <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {isAlbyAvailable ? 'Recommended - Secure key management' : 'Install Alby extension'}
                                </div>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setConnectionMethod('manual')}
                        disabled={isConnected}
                        className={`relative flex items-center p-4 rounded-xl border-2 transition-all ${connectionMethod === 'manual'
                            ? isDark
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-primary-500 bg-primary-50'
                            : isDark
                                ? 'border-dark-600 hover:border-dark-500 bg-dark-800/50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            } ${isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${connectionMethod === 'manual'
                                ? 'bg-blue-100 text-blue-600'
                                : isDark ? 'bg-dark-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                                }`}>
                                <Key className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">Manual Key</div>
                                <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Enter or generate private key
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Authentication */}
                <div className="space-y-4">
                    <AnimatePresence mode="wait">
                        {connectionMethod === 'alby' ? (
                            <motion.div
                                key="alby-section"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4"
                            >
                                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Alby Wallet Connection
                                </label>

                                {!isAlbyAvailable ? (
                                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-yellow-900/20 border-yellow-800/50' : 'bg-yellow-50 border-yellow-200'}`}>
                                        <div className="flex items-start space-x-3">
                                            <ExternalLink className={`w-5 h-5 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                                            <div>
                                                <p className={`font-medium text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                                                    Alby Extension Required
                                                </p>
                                                <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                                                    Install the Alby browser extension for secure key management.
                                                </p>
                                                <a
                                                    href="https://getalby.com/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`inline-flex items-center space-x-2 mt-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark
                                                        ? 'bg-yellow-800/50 text-yellow-300 hover:bg-yellow-800/70'
                                                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                        }`}
                                                >
                                                    <span>Install Alby</span>
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ) : !isAlbyConnected ? (
                                    <button
                                        onClick={handleAlbyConnect}
                                        disabled={isAlbyConnecting || isConnected}
                                        className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all ${isAlbyConnecting || isConnected
                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                            : 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl'
                                            }`}
                                    >
                                        {isAlbyConnecting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Connecting to Alby...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Wallet className="w-5 h-5" />
                                                <span>Connect Alby Wallet</span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-green-900/20 border-green-800/50' : 'bg-green-50 border-green-200'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Wallet className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                                                <div>
                                                    <p className={`font-medium text-sm ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                                                        Alby Connected
                                                    </p>
                                                    <p className={`text-xs font-mono ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                                        {albyPublicKey?.substring(0, 16)}...
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleCopyPublicKey}
                                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-green-800/50' : 'hover:bg-green-200'
                                                    }`}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {albyError && (
                                    <div className={`p-3 rounded-lg ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-800'}`}>
                                        <p className="text-sm">{albyError}</p>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="manual-section"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4"
                            >
                                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Your Private Key
                                </label>

                                <div className="relative">
                                    <input
                                        type={showPrivateKey ? 'text' : 'password'}
                                        value={localPrivateKey}
                                        onChange={(e) => setLocalPrivateKey(e.target.value)}
                                        placeholder="Enter your private key or generate new"
                                        disabled={isConnected}
                                        className={`input-primary font-mono text-sm ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-md transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleGenerateKey}
                                        disabled={isConnected}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDark ? 'bg-dark-600 text-gray-300 hover:bg-dark-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            } ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Generate New</span>
                                    </button>

                                    <button
                                        onClick={handleCopyPublicKey}
                                        disabled={!localPrivateKey}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDark ? 'bg-dark-600 text-gray-300 hover:bg-dark-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            } ${!localPrivateKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Copy className="w-4 h-4" />
                                        <span>Copy Pubkey</span>
                                    </button>
                                </div>

                                {currentPublicKey && (
                                    <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-dark-700/50 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                        <p className="font-medium mb-1">Your Public Key:</p>
                                        <p className="font-mono break-all">{currentPublicKey}</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Column - DVM Configuration */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            DVM Public Key
                        </label>
                        <button
                            onClick={fetchDvmInfo}
                            disabled={isDvmInfoLoading || isConnected}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300 hover:bg-dark-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                } ${isDvmInfoLoading || isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Zap className={`w-3 h-3 ${isDvmInfoLoading ? 'animate-spin' : ''}`} />
                            <span>Auto-load</span>
                        </button>
                    </div>

                    <input
                        type="text"
                        value={localDvmPublicKey}
                        onChange={(e) => setLocalDvmPublicKey(e.target.value)}
                        placeholder="Enter DVM's public key"
                        disabled={isConnected || isDvmInfoLoading}
                        className={`input-primary font-mono text-sm ${isConnected || isDvmInfoLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />

                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p>The DVM public key will be auto-loaded when the server starts.</p>
                        <p className="mt-1">You can also get it from the server console or manual entry.</p>
                    </div>
                </div>
            </div>

            {/* Connection Button */}
            <div className="mt-6 flex justify-center">
                {isConnected ? (
                    <button
                        onClick={handleDisconnect}
                        className="flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
                    >
                        <Unlink className="w-5 h-5" />
                        <span>Disconnect from DVM</span>
                    </button>
                ) : (
                    <button
                        onClick={handleConnect}
                        disabled={
                            isConnecting ||
                            !localDvmPublicKey ||
                            (connectionMethod === 'alby' ? !isAlbyConnected : !localPrivateKey)
                        }
                        className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl ${isConnecting ||
                            !localDvmPublicKey ||
                            (connectionMethod === 'alby' ? !isAlbyConnected : !localPrivateKey)
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'btn-primary'
                            }`}
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Connecting...</span>
                            </>
                        ) : (
                            <>
                                <Link className="w-5 h-5" />
                                <span>Connect to DVM</span>
                                {connectionMethod === 'alby' && <Wallet className="w-4 h-4" />}
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

export default ConnectionPanel