import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Loader2, Shield, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const RequestPanel = ({ activeTab, onSendRequest, isConnected, currentRequest, isDark }) => {
    const [requestData, setRequestData] = useState({
        threatLevel: 'medium',
        maxResults: 10,
        useCase: '',
        context: '',
        currentRelays: []
    })

    const [currentRelayInput, setCurrentRelayInput] = useState('')

    const threatLevels = [
        {
            value: 'low',
            label: 'Low (Casual Use)',
            description: 'Basic privacy, prioritizes performance',
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        },
        {
            value: 'medium',
            label: 'Medium (General Privacy)',
            description: 'Balanced privacy and performance',
            color: 'text-yellow-600 dark:text-yellow-400',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        },
        {
            value: 'high',
            label: 'High (Journalist/Activist)',
            description: 'Strong privacy protections',
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
        },
        {
            value: 'nation-state',
            label: 'Nation-State (Maximum Privacy)',
            description: 'Extreme privacy measures',
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }
    ]

    const useCases = [
        { value: 'social', label: 'Social Media' },
        { value: 'journalism', label: 'Journalism' },
        { value: 'activism', label: 'Activism' },
        { value: 'trading', label: 'Trading' },
        { value: 'development', label: 'Development' },
        { value: 'research', label: 'Research' },
        { value: 'other', label: 'Other' }
    ]

    const getCurrentThreatLevel = () => {
        return threatLevels.find(t => t.value === requestData.threatLevel)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!isConnected) {
            toast.error('Please connect to DVM first')
            return
        }

        try {
            const payload = {
                requestType: activeTab,
                ...requestData,
                currentRelays: activeTab === 'analyze' ? requestData.currentRelays : undefined
            }

            await onSendRequest(payload)
            toast.success('Request sent to DVM!')
        } catch (error) {
            toast.error(`Failed to send request: ${error.message}`)
        }
    }

    const addCurrentRelay = () => {
        if (currentRelayInput.trim() && !requestData.currentRelays.includes(currentRelayInput.trim())) {
            setRequestData(prev => ({
                ...prev,
                currentRelays: [...prev.currentRelays, currentRelayInput.trim()]
            }))
            setCurrentRelayInput('')
        }
    }

    const removeRelay = (index) => {
        setRequestData(prev => ({
            ...prev,
            currentRelays: prev.currentRelays.filter((_, i) => i !== index)
        }))
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            {/* Request Type Info */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-primary-500/10 border-primary-500/20' : 'bg-primary-50 border-primary-200'
                }`}>
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-600'
                        }`}>
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`font-semibold ${isDark ? 'text-primary-300' : 'text-primary-800'
                            }`}>
                            {activeTab === 'recommend' && 'Get Recommendations'}
                            {activeTab === 'analyze' && 'Analyze Current Setup'}
                            {activeTab === 'discover' && 'Discovery Mode'}
                            {activeTab === 'health' && 'Network Health Check'}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-primary-400' : 'text-primary-600'
                            }`}>
                            {activeTab === 'recommend' && 'Get personalized relay recommendations based on your threat model'}
                            {activeTab === 'analyze' && 'Analyze your current relay setup for privacy and performance'}
                            {activeTab === 'discover' && 'Find new relays with quality content you might enjoy'}
                            {activeTab === 'health' && 'Monitor the health and performance of the Nostr relay network'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Request Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Threat Level */}
                <div className="space-y-3">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Threat Level
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {threatLevels.map((level) => (
                            <motion.label
                                key={level.value}
                                className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${requestData.threatLevel === level.value
                                        ? level.bgColor
                                        : isDark
                                            ? 'border-dark-600 hover:border-dark-500 bg-dark-800/50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <input
                                    type="radio"
                                    name="threatLevel"
                                    value={level.value}
                                    checked={requestData.threatLevel === level.value}
                                    onChange={(e) => setRequestData(prev => ({ ...prev, threatLevel: e.target.value }))}
                                    className="sr-only"
                                />

                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium text-sm ${level.color}`}>
                                        {level.label}
                                    </div>
                                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                        {level.description}
                                    </div>
                                </div>

                                {requestData.threatLevel === level.value && (
                                    <motion.div
                                        layoutId="selectedThreat"
                                        className={`w-4 h-4 rounded-full ${level.value === 'low' ? 'bg-green-500' :
                                                level.value === 'medium' ? 'bg-yellow-500' :
                                                    level.value === 'high' ? 'bg-orange-500' : 'bg-red-500'
                                            }`}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </motion.label>
                        ))}
                    </div>

                    {/* Threat Level Warning */}
                    {(requestData.threatLevel === 'high' || requestData.threatLevel === 'nation-state') && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`flex items-start space-x-3 p-3 rounded-lg ${isDark ? 'bg-yellow-900/20 border border-yellow-800/50' : 'bg-yellow-50 border border-yellow-200'
                                }`}
                        >
                            <AlertTriangle className={`w-5 h-5 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'
                                }`} />
                            <div className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'
                                }`}>
                                <p className="font-medium">High Privacy Mode</p>
                                <p>This will prioritize maximum privacy and security over performance. Results may include Tor-accessible relays and require additional verification.</p>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Additional Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Max Results */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            Maximum Results
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={requestData.maxResults}
                            onChange={(e) => setRequestData(prev => ({ ...prev, maxResults: parseInt(e.target.value) || 10 }))}
                            className="input-primary"
                        />
                    </div>

                    {/* Use Case */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            Use Case (Optional)
                        </label>
                        <select
                            value={requestData.useCase}
                            onChange={(e) => setRequestData(prev => ({ ...prev, useCase: e.target.value }))}
                            className="input-primary"
                        >
                            <option value="">Select use case...</option>
                            {useCases.map(useCase => (
                                <option key={useCase.value} value={useCase.value}>
                                    {useCase.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Current Relays (for analyze mode) */}
                {activeTab === 'analyze' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                    >
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            Current Relays
                        </label>

                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={currentRelayInput}
                                onChange={(e) => setCurrentRelayInput(e.target.value)}
                                placeholder="wss://relay.example.com"
                                className="flex-1 input-primary"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCurrentRelay())}
                            />
                            <button
                                type="button"
                                onClick={addCurrentRelay}
                                className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                            >
                                Add
                            </button>
                        </div>

                        {requestData.currentRelays.length > 0 && (
                            <div className="space-y-2">
                                {requestData.currentRelays.map((relay, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <span className="font-mono text-sm">{relay}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeRelay(index)}
                                            className={`text-red-500 hover:text-red-700 transition-colors ${isDark ? 'hover:text-red-400' : ''
                                                }`}
                                        >
                                            Remove
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Context */}
                <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Additional Context (Optional)
                    </label>
                    <textarea
                        value={requestData.context}
                        onChange={(e) => setRequestData(prev => ({ ...prev, context: e.target.value }))}
                        placeholder="Any additional context or specific requirements..."
                        rows="3"
                        className="input-primary resize-none"
                    />
                </div>

                {/* Submit Button */}
                <motion.button
                    type="submit"
                    disabled={!isConnected || currentRequest}
                    className={`w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-medium transition-all ${!isConnected || currentRequest
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'btn-primary'
                        }`}
                    whileHover={!isConnected || currentRequest ? {} : { scale: 1.02 }}
                    whileTap={!isConnected || currentRequest ? {} : { scale: 0.98 }}
                >
                    {currentRequest ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Sending Request...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            <span>
                                {activeTab === 'recommend' && 'Get Recommendations'}
                                {activeTab === 'analyze' && 'Analyze Setup'}
                                {activeTab === 'discover' && 'Discover Relays'}
                                {activeTab === 'health' && 'Check Network Health'}
                            </span>
                        </>
                    )}
                </motion.button>

                {/* Connection Warning */}
                {!isConnected && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}
                    >
                        Please connect to a DVM above to send requests
                    </motion.div>
                )}
            </form>
        </motion.div>
    )
}

export default RequestPanel