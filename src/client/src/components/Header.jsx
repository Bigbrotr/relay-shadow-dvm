import React from 'react'
import { motion } from 'framer-motion'
import { Eye, Sun, Moon, Shield, Zap } from 'lucide-react'

const Header = ({ isDark, setIsDark, isConnected }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden"
        >
            {/* Gradient background */}
            <div className={`${isDark
                    ? 'bg-gradient-to-br from-primary-600 via-purple-600 to-indigo-700'
                    : 'bg-gradient-to-br from-primary-500 via-purple-500 to-indigo-600'
                } p-8`}>

                {/* Animated particles */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full opacity-30"
                            initial={{
                                x: Math.random() * 1000,
                                y: Math.random() * 200,
                                opacity: 0
                            }}
                            animate={{
                                x: Math.random() * 1000,
                                y: Math.random() * 200,
                                opacity: [0, 0.6, 0]
                            }}
                            transition={{
                                duration: Math.random() * 3 + 2,
                                repeat: Infinity,
                                repeatType: "reverse",
                                delay: Math.random() * 2
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-10 flex items-center justify-between">
                    {/* Logo and title */}
                    <div className="flex items-center space-x-4">
                        <motion.div
                            className="relative"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center border border-white/30">
                                <Eye className="w-8 h-8 text-white" />
                            </div>
                            {isConnected && (
                                <motion.div
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
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

                    {/* Status indicators and theme toggle */}
                    <div className="flex items-center space-x-4">
                        {/* Connection status */}
                        <motion.div
                            className={`flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-sm border ${isConnected
                                    ? 'bg-green-500/20 border-green-400/50 text-green-100'
                                    : 'bg-white/10 border-white/30 text-white/70'
                                }`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-white/50'
                                }`} />
                            <span className="text-sm font-medium">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </motion.div>

                        {/* Feature badges */}
                        <motion.div
                            className="hidden md:flex items-center space-x-2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs">
                                <Shield className="w-3 h-3" />
                                <span>Privacy First</span>
                            </div>
                            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs">
                                <Zap className="w-3 h-3" />
                                <span>Real-time</span>
                            </div>
                        </motion.div>

                        {/* Theme toggle */}
                        <motion.button
                            onClick={() => setIsDark(!isDark)}
                            className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white/20 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, rotate: -180 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </motion.button>
                    </div>
                </div>

                {/* Hackathon badge */}
                <motion.div
                    className="mt-6 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 text-white/90 text-sm">
                        <span>🏆</span>
                        <span className="font-medium">Bitcoin++ Privacy Edition Hackathon 2025</span>
                        <span>•</span>
                        <span className="text-white/70">Powered by BigBrotr Dataset</span>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}

export default Header