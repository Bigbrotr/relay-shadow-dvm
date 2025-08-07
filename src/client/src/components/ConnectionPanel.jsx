import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Link, Unlink, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { generatePrivateKey, getPublicKey } from 'nostr-tools'
import toast from 'react-hot-toast'

const ConnectionPanel = ({
    isConnected,
    privateKey,
    dvmPublicKey,
    onConnect,
    onDisconnect,
    isDark
}) => {
    const [localPrivateKey, setLocalPrivateKey] = useState(privateKey)
    const [localDvmPublicKey, setLocalDvmPublicKey] = useState(dvmPublicKey)
    const [showPrivateKey, setShowPrivateKey] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)

    const handleGenerateKey = () => {
        const newKey = generatePrivateKey()
        setLocalPrivateKey(newKey)
        toast.success('New private key generated!')
    }

    const handleCopyPublicKey = () => {
        if (!localPrivateKey) return

        const pubkey = getPublicKey(localPrivateKey)
        navigator.clipboard.writeText(pubkey)
        toast.success('Public key copied to clipboard!')
    }

    const handleConnect = async () => {
        if (!localPrivateKey || !localDvmPublicKey) {
            toast.error('Please provide both private key and DVM public key')
            return
        }

        setIsConnecting(true)
        try {
            await onConnect(localPrivateKey, localDvmPublicKey)
            toast.success('Successfully connected to DVM!')
        } catch (error) {
            toast.error(`Connection failed: ${error.message}`)
        } finally {
            setIsConnecting(false)
        }
    }

    const handleDisconnect = async () => {
        await onDisconnect()
        toast.success('Disconnected from DVM')
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`p-6 border-b ${isDark ? 'border-dark-700 bg-dark-800/30' : 'border-gray-200 bg-gray-50/30'
                }`}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-600'
                        }`}>
                        <Key className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold">Client Configuration</h3>
                </div>

                {isConnected && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center space-x-2 text-green-500"
                    >
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">Connected</span>
                    </motion.div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Private Key Section */}
                <div className="space-y-4">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Your Private Key
                    </label>

                    <div className="relative">
                        <input
                            type={showPrivateKey ? 'text' : 'password'}
                            value={localPrivateKey}
                            onChange={(e) => setLocalPrivateKey(e.target.value)}
                            placeholder="Enter your private key or generate new"
                            disabled={isConnected}
                            className={`w-full px-4 py-3 pr-12 rounded-xl border font-mono text-sm transition-all ${isDark
                                    ? 'bg-dark-700 border-dark-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-primary-500/20'
                                } ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        <motion.button
                            type="button"
                            onClick={handleGenerateKey}
                            disabled={isConnected}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDark
                                    ? 'bg-dark-600 text-gray-300 hover:bg-dark-500 disabled:opacity-50'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                                } ${isConnected ? 'cursor-not-allowed' : ''}`}
                            whileHover={!isConnected ? { scale: 1.02 } : {}}
                            whileTap={!isConnected ? { scale: 0.98 } : {}}
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Generate New</span>
                        </motion.button>

                        <motion.button
                            type="button"
                            onClick={handleCopyPublicKey}
                            disabled={!localPrivateKey}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDark
                                    ? 'bg-dark-600 text-gray-300 hover:bg-dark-500 disabled:opacity-50'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                                } ${!localPrivateKey ? 'cursor-not-allowed' : ''}`}
                            whileHover={localPrivateKey ? { scale: 1.02 } : {}}
                            whileTap={localPrivateKey ? { scale: 0.98 } : {}}
                        >
                            <Copy className="w-4 h-4" />
                            <span>Copy Pubkey</span>
                        </motion.button>
                    </div>

                    {localPrivateKey && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`p-3 rounded-lg text-xs ${isDark ? 'bg-dark-700/50 text-gray-400' : 'bg-gray-100 text-gray-600'
                                }`}
                        >
                            <p className="font-medium mb-1">Your Public Key:</p>
                            <p className="font-mono break-all">{getPublicKey(localPrivateKey)}</p>
                        </motion.div>
                    )}
                </div>

                {/* DVM Public Key Section */}
                <div className="space-y-4">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        DVM Public Key
                    </label>

                    <input
                        type="text"
                        value={localDvmPublicKey}
                        onChange={(e) => setLocalDvmPublicKey(e.target.value)}
                        placeholder="Enter DVM's public key (npub or hex)"
                        disabled={isConnected}
                        className={`w-full px-4 py-3 rounded-xl border font-mono text-sm transition-all ${isDark
                                ? 'bg-dark-700 border-dark-600 text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500/20'
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-primary-500/20'
                            } ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />

                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p className="mb-2">Get the DVM's public key from the server console output when starting the DVM.</p>
                        <p className="font-medium">Example formats:</p>
                        <p className="font-mono">npub1abc123... or hex format</p>
                    </div>
                </div>
            </div>

            {/* Connection Button */}
            <div className="mt-6 flex justify-center">
                {isConnected ? (
                    <motion.button
                        onClick={handleDisconnect}
                        className="flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-red-500/25"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Unlink className="w-5 h-5" />
                        <span>Disconnect from DVM</span>
                    </motion.button>
                ) : (
                    <motion.button
                        onClick={handleConnect}
                        disabled={!localPrivateKey || !localDvmPublicKey || isConnecting}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all shadow-lg ${!localPrivateKey || !localDvmPublicKey || isConnecting
                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                : 'bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 text-white hover:shadow-primary-500/25'
                            }`}
                        whileHover={!localPrivateKey || !localDvmPublicKey || isConnecting ? {} : { scale: 1.02 }}
                        whileTap={!localPrivateKey || !localDvmPublicKey || isConnecting ? {} : { scale: 0.98 }}
                    >
                        {isConnecting ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </motion.div>
                                <span>Connecting...</span>
                            </>
                        ) : (
                            <>
                                <Link className="w-5 h-5" />
                                <span>Connect to DVM</span>
                            </>
                        )}
                    </motion.button>
                )}
            </div>

            {/* Connection Tips */}
            {!isConnected && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
                        }`}
                >
                    <div className="flex items-start space-x-3">
                        <div className={`p-1 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}>
                            <Key className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <h4 className={`font-medium text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'
                                }`}>
                                Getting Started
                            </h4>
                            <ul className={`mt-2 text-xs space-y-1 ${isDark ? 'text-blue-200' : 'text-blue-700'
                                }`}>
                                <li>• Generate a new private key or use an existing one</li>
                                <li>• Get the DVM public key from your running DVM server</li>
                                <li>• Click "Connect to DVM" to establish connection</li>
                                <li>• Start sending privacy-focused relay recommendations!</li>
                            </ul>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    )
}

export default ConnectionPanel