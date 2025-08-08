import React from 'react'
import { motion } from 'framer-motion'
import { Eye, Sun, Moon, Shield, Zap, Wallet, ExternalLink } from 'lucide-react'

const Header = ({ isDark, setIsDark, isConnected, userPublicKey, dvmInfo }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden"
        >
            {/* Animated gradient background */}
            <div className={`${isDark
                ? 'bg-gradient-to-br from-primary-600 via-purple-600 to-indigo-700'
                : 'bg-gradient-to-br from-primary-500 via-purple-500 to-indigo-600'
                } relative`}>

                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                    <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute bottom-10 left-1/3 w-16 h-16 bg-white/10 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="relative z-10 p-8">
                    <div className="flex items-center justify-between mb-6">
                        {/* Logo and Title */}
                        <div className="flex items-center space-x-4">
                            <motion.div
                                className="relative"
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
                                    <Eye className="w-8 h-8 text-white" />
                                </div>
                                <motion.div
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </motion.div>

                            <div>
                                <motion.h1
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2, duration: 0.6 }}
                                    className="text-3xl font-bold text-white"
                                >
                                    Relay Shadow
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4, duration: 0.6 }}
                                    className="text-white/80 text-sm"
                                >
                                    Privacy-Focused Relay Recommendations
                                </motion.p>
                            </div>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center space-x-4">
                            {/* Connection Status */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className={`px-4 py-2 rounded-xl backdrop-blur-sm border transition-all ${isConnected
                                    ? 'bg-green-500/20 border-green-400/50 text-green-100'
                                    : 'bg-white/10 border-white/30 text-white/80'
                                    }`}
                            >
                                <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-white/50'
                                        }`} />
                                    <span className="text-sm font-medium">
                                        {isConnected ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>

                                {isConnected && userPublicKey && (
                                    <div className="flex items-center space-x-2 pl-2 border-l border-white/20 mt-1">
                                        <Wallet className="w-4 h-4" />
                                        <span className="text-xs font-mono">
                                            {userPublicKey.substring(0, 8)}...
                                        </span>
                                    </div>
                                )}
                            </motion.div>

                            {/* Dark mode toggle */}
                            <motion.button
                                onClick={() => setIsDark(!isDark)}
                                className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white/20 transition-colors shadow-lg"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, rotate: -90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </motion.button>
                        </div>
                    </div>

                    {/* Feature highlights */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                        <div className="flex items-center space-x-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                            <Shield className="w-6 h-6 text-white/90" />
                            <div>
                                <h3 className="font-semibold text-white text-sm">Privacy-First</h3>
                                <p className="text-white/70 text-xs">Threat model based recommendations</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                            <Zap className="w-6 h-6 text-white/90" />
                            <div>
                                <h3 className="font-semibold text-white text-sm">Real-time Analysis</h3>
                                <p className="text-white/70 text-xs">Live relay performance metrics</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                            <Eye className="w-6 h-6 text-white/90" />
                            <div>
                                <h3 className="font-semibold text-white text-sm">Shadow Analysis</h3>
                                <p className="text-white/70 text-xs">Comprehensive network insights</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* DVM Status */}
                    {dvmInfo && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-white/90 text-sm font-medium">
                                        DVM Active • {dvmInfo.relays?.length || 0} relays monitored
                                    </span>
                                </div>
                                <span className="text-white/70 text-xs font-mono">
                                    {dvmInfo.publicKey?.substring(0, 16)}...
                                </span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export default Header