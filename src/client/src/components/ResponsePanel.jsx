import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Clock, ExternalLink, Activity, TrendingUp } from 'lucide-react'

const ResponsePanel = ({ responses, currentRequest, activeTab, isDark }) => {
    if (!responses.length && !currentRequest) {
        return (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-700' : 'bg-gray-100'
                    }`}>
                    <Clock className="w-8 h-8" />
                </div>
                <p className="text-lg font-medium mb-2">No responses yet</p>
                <p className="text-sm">Connect to a DVM and send a request to see results here</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 mt-8">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                DVM Responses
            </h3>

            {/* Loading State */}
            {currentRequest && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border ${isDark ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'
                        }`}
                >
                    <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                        <div>
                            <p className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                                Processing your request...
                            </p>
                            <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                Request ID: {currentRequest.id.substring(0, 8)}...
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Responses */}
            <AnimatePresence>
                {responses.map((response, index) => (
                    <motion.div
                        key={response._meta?.eventId || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className={`p-6 rounded-xl border ${isDark ? 'bg-dark-800/50 border-dark-700' : 'bg-white border-gray-200'
                            }`}
                    >
                        <ResponseContent response={response} isDark={isDark} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}

const ResponseContent = ({ response, isDark }) => {
    if (response.type === 'error') {
        return (
            <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
                <div>
                    <h4 className={`font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                        Request Failed
                    </h4>
                    <p className={`text-sm mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {response.error}
                    </p>
                </div>
            </div>
        )
    }

    if (response.type === 'relay_recommendations') {
        return (
            <div>
                <div className="flex items-center space-x-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                        <h4 className={`font-medium ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                            Relay Recommendations
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {response.recommendations.primary?.length || 0} recommendations for {response.analysis?.threatLevel || 'unknown'} threat level
                        </p>
                    </div>
                </div>

                {/* Primary Recommendations */}
                {response.recommendations.primary?.length > 0 && (
                    <div className="space-y-3">
                        <h5 className={`font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Primary Recommendations
                        </h5>
                        {response.recommendations.primary.map((rec, index) => (
                            <div
                                key={rec.url}
                                className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700/50 border-dark-600' : 'bg-gray-50 border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-primary-900/50 text-primary-300' : 'bg-primary-100 text-primary-800'
                                            }`}>
                                            #{index + 1}
                                        </span>
                                        <code className={`text-sm font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {rec.url}
                                        </code>
                                    </div>
                                    <a
                                        href={rec.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-600 ${isDark ? 'text-gray-400' : 'text-gray-600'
                                            }`}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>

                                <div className="flex items-center space-x-4 mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Overall:
                                        </span>
                                        <span className="font-medium text-sm">
                                            {rec.scores.overall.toFixed(1)}/10
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Privacy:
                                        </span>
                                        <span className="font-medium text-sm">
                                            {rec.scores.privacy.toFixed(1)}/10
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Reliability:
                                        </span>
                                        <span className="font-medium text-sm">
                                            {rec.scores.reliability.toFixed(1)}/10
                                        </span>
                                    </div>
                                </div>

                                {rec.network && (rec.network.followingUsersHere > 0 || rec.network.totalInfluenceWeight > 0) && (
                                    <div className="flex items-center space-x-4 mb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Following users:
                                            </span>
                                            <span className="font-medium text-sm">
                                                {rec.network.followingUsersHere}
                                            </span>
                                        </div>
                                        {rec.network.totalInfluenceWeight > 0 && (
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    Influence:
                                                </span>
                                                <span className="font-medium text-sm">
                                                    {rec.network.totalInfluenceWeight.toFixed(1)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {rec.reasoning && (
                                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {rec.reasoning}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Analysis Summary */}
                {response.analysis && (
                    <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-dark-700/30' : 'bg-gray-50'
                        }`}>
                        <h5 className={`font-medium text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Analysis Summary
                        </h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Threat Level:
                                </span>
                                <span className="ml-2 font-medium">
                                    {response.analysis.threatLevel}
                                </span>
                            </div>
                            <div>
                                <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Total Recommendations:
                                </span>
                                <span className="ml-2 font-medium">
                                    {response.analysis.totalRecommendations}
                                </span>
                            </div>
                        </div>
                        {response.analysis.currentRelayCoverage && (
                            <div className="mt-2 text-sm">
                                <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Coverage:
                                </span>
                                <span className="ml-2 font-medium">
                                    {response.analysis.currentRelayCoverage}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    if (response.type === 'relay_analysis') {
        return (
            <div>
                <div className="flex items-center space-x-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                    <div>
                        <h4 className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                            Relay Setup Analysis
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            Analysis of {response.current_setup?.relay_count || 0} configured relays
                        </p>
                    </div>
                </div>

                {/* Current Setup */}
                {response.current_setup && (
                    <div className={`mb-6 p-4 rounded-lg ${isDark ? 'bg-dark-700/30' : 'bg-gray-50'}`}>
                        <h5 className={`font-medium text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Current Setup ({response.current_setup.relay_count} relays)
                        </h5>
                        <div className="space-y-1">
                            {response.current_setup.relays.map((relay, index) => (
                                <code key={index} className={`block text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {relay}
                                </code>
                            ))}
                        </div>
                    </div>
                )}

                {/* Analysis Metrics */}
                {response.metrics && Object.keys(response.metrics).length > 0 && (
                    <div className="space-y-6">
                        {Object.entries(response.metrics).map(([category, metrics]) => (
                            <div key={category}>
                                <h5 className={`font-medium text-sm mb-3 capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {category} Analysis
                                </h5>
                                <div className="space-y-3">
                                    {Object.entries(metrics).map(([metric, data]) => (
                                        <div key={metric} className={`p-3 rounded-lg border ${isDark ? 'bg-dark-700/50 border-dark-600' : 'bg-gray-50 border-gray-200'
                                            }`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-sm font-medium capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {metric.replace(/_/g, ' ')}
                                                </span>
                                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {data.value}
                                                </span>
                                            </div>
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {data.recommendation}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    if (response.type === 'discovery_recommendations') {
        return (
            <div>
                <div className="flex items-center space-x-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-purple-500" />
                    <div>
                        <h4 className={`font-medium ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>
                            Discovery Recommendations
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                            {response.discoveries?.length || 0} relays with quality content to explore
                        </p>
                    </div>
                </div>

                {response.discoveries?.length > 0 && (
                    <div className="space-y-3">
                        {response.discoveries.map((disc, index) => (
                            <div
                                key={disc.url}
                                className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700/50 border-dark-600' : 'bg-gray-50 border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <code className={`text-sm font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {disc.url}
                                    </code>
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Discovery Score:
                                        </span>
                                        <span className="font-medium text-sm">
                                            {disc.discoveryScore.toFixed(1)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4 mb-2 text-sm">
                                    <div>
                                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Quality Publishers:
                                        </span>
                                        <span className="ml-2 font-medium">
                                            {disc.uniquePublishers}
                                        </span>
                                    </div>
                                    <div>
                                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Avg Influence:
                                        </span>
                                        <span className="ml-2 font-medium">
                                            {disc.avgInfluence.toFixed(1)}
                                        </span>
                                    </div>
                                </div>

                                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {disc.reasoning}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    if (response.type === 'relay_health_summary') {
        return (
            <div>
                <div className="flex items-center space-x-3 mb-4">
                    <Activity className="w-6 h-6 text-green-500" />
                    <div>
                        <h4 className={`font-medium ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                            Network Health Summary
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {response.summary.total} relays analyzed
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {Object.entries(response.summary.categories).map(([status, count]) => (
                        <div
                            key={status}
                            className={`p-3 rounded-lg text-center ${isDark ? 'bg-dark-700/50' : 'bg-gray-50'
                                }`}
                        >
                            <div className="text-2xl font-bold">
                                {count}
                            </div>
                            <div className={`text-xs capitalize ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {status}
                            </div>
                        </div>
                    ))}
                </div>

                {response.categories.healthy?.length > 0 && (
                    <div>
                        <h5 className={`font-medium text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Healthy Relays (Top 10)
                        </h5>
                        <div className="space-y-2">
                            {response.categories.healthy.slice(0, 10).map((relay) => (
                                <div
                                    key={relay.url}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? 'bg-dark-700/50 border-dark-600' : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <code className={`text-sm font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {relay.url}
                                    </code>
                                    <div className="flex items-center space-x-4 text-sm">
                                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {relay.uptime.toFixed(1)}% uptime
                                        </span>
                                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {relay.latency}ms
                                        </span>
                                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                            {relay.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Generic response handler
    return (
        <div>
            <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                    <h4 className={`font-medium ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                        DVM Response
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        Type: {response.type}
                    </p>
                </div>
            </div>

            <pre className={`p-4 rounded-lg overflow-auto text-sm ${isDark ? 'bg-dark-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                }`}>
                {JSON.stringify(response, null, 2)}
            </pre>
        </div>
    )
}

export default ResponsePanel