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
                                <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                                    <Eye className="w-8 h-8 text-white" />
                                </div>
                                {isConnected && (
                                    <motion.div
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white shadow-lg"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </motion.div>

                            <div>
                                <motion.h1
                                    className="text-4xl font-bold text-white mb-2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    Relay Shadow
                                </motion.h1>
                                <motion.p
                                    className="text-white/80 text-lg"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Privacy-Focused Nostr Relay Intelligence
                                </motion.p>
                            </div>
                        </div>

                        {/* Status and Controls */}
                        <div className="flex items-center space-x-4">
                            {/* Connection Status */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 }}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl backdrop-blur-sm border shadow-lg ${isConnected
                                    ? 'bg-green-500/20 border-green-400/50 text-green-100'
                                    : 'bg-white/10 border-white/30 text-white/70'
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
                                    <div className="flex items-center space-x-2 pl-2 border-l border-white/20">
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

                    {/* DVM Info Bar */}
                    {dvmInfo && (
                        <motion.div
                            className="mb-6 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Shield className="w-5 h-5 text-white/80" />
                                    <div>
                                        <p className="text-white/90 font-medium text-sm">
                                            Connected to Relay Shadow DVM
                                        </p>
                                        <p className="text-white/60 text-xs font-mono">
                                            {dvmInfo.publicKey?.substring(0, 16)}...
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 text-white/70">
                                    <div className="text-xs">
                                        <span className="font-medium">{dvmInfo.relays?.length || 0}</span> relays
                                    </div>
                                    <div className="text-xs">
                                        <span className="font-medium">{dvmInfo.supportedRequests?.length || 0}</span> services
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Hackathon Badge */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                    >
                        <div className="inline-flex items-center space-x-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 text-white/90">
                            <span className="text-xl">🏆</span>
                            <span className="font-semibold">Bitcoin++ Privacy Edition Hackathon 2025</span>
                            <span className="text-white/60">•</span>
                            <div className="flex items-center space-x-2">
                                <Zap className="w-4 h-4 text-yellow-300" />
                                <span className="text-white/70 font-medium">Powered by BigBrotr Dataset</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Feature highlights */}
                    <motion.div
                        className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        {[
                            { icon: Shield, title: 'Threat-Level Based', desc: 'From casual to nation-state' },
                            { icon: Eye, title: '800+ Relays Analyzed', desc: 'Real network intelligence' },
                            { icon: Zap, title: 'Social Graph Integration', desc: 'Personalized recommendations' }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm"
                                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                transition={{ duration: 0.2 }}
                            >
                                <feature.icon className="w-5 h-5 text-white/70" />
                                <div>
                                    <p className="text-white/90 font-medium text-sm">{feature.title}</p>
                                    <p className="text-white/60 text-xs">{feature.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    )
}

export default Header