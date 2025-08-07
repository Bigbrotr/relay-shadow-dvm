import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Link, Unlink, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { generatePrivateKey, getPublicKey } from 'nostr-tools'
import toast from 'react-hot-toast'

const ConnectionPanel = ({ isConnected, privateKey, dvmPublicKey, onConnect, onDisconnect, isDark }) => {
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
        <div className={`p-6 border-b ${isDark ? 'border-dark-700 bg-dark-800/30' : 'border-gray-200 bg-gray-50/30'}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-600'}`}>
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
                <div className="space-y-4">
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

                    {localPrivateKey && (
                        <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-dark-700/50 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                            <p className="font-medium mb-1">Your Public Key:</p>
                            <p className="font-mono break-all">{getPublicKey(localPrivateKey)}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        DVM Public Key
                    </label>

                    <input
                        type="text"
                        value={localDvmPublicKey}
                        onChange={(e) => setLocalDvmPublicKey(e.target.value)}
                        placeholder="Enter DVM's public key"
                        disabled={isConnected}
                        className={`input-primary font-mono text-sm ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />

                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p>Get the DVM's public key from the server console when starting the DVM.</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-center">
                {isConnected ? (
                    <button
                        onClick={handleDisconnect}
                        className="flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all"
                    >
                        <Unlink className="w-5 h-5" />
                        <span>Disconnect from DVM</span>
                    </button>
                ) : (
                    <button
                        onClick={handleConnect}
                        disabled={!localPrivateKey || !localDvmPublicKey || isConnecting}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${!localPrivateKey || !localDvmPublicKey || isConnecting
                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                : 'btn-primary'
                            }`}
                    >
                        {isConnecting ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>Connecting...</span>
                            </>
                        ) : (
                            <>
                                <Link className="w-5 h-5" />
                                <span>Connect to DVM</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

export default ConnectionPanel