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
            <div className={`${isDark
                ? 'bg-gradient-to-br from-primary-600 via-purple-600 to-indigo-700'
                : 'bg-gradient-to-br from-primary-500 via-purple-500 to-indigo-600'
                } p-8`}>

                <div className="relative z-10 flex items-center justify-between">
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
                            <h1 className="text-4xl font-bold text-white mb-2">
                                Relay Shadow
                            </h1>
                            <p className="text-white/80 text-lg">
                                Privacy-Focused Nostr Relay Intelligence
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <motion.div
                            className={`flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-sm border ${isConnected
                                    ? 'bg-green-500/20 border-green-400/50 text-green-100'
                                    : 'bg-white/10 border-white/30 text-white/70'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-white/50'
                                }`} />
                            <span className="text-sm font-medium">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </motion.div>

                        <motion.button
                            onClick={() => setIsDark(!isDark)}
                            className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white/20 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </motion.button>
                    </div>
                </div>

                <motion.div className="mt-6 text-center">
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