import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Activity, Search } from 'lucide-react'

const Navigation = ({ activeTab, setActiveTab, isDark, disabled }) => {
    const tabs = [
        {
            id: 'recommend',
            label: 'Get Recommendations',
            icon: Shield,
            description: 'Privacy-focused relay suggestions'
        },
        {
            id: 'analyze',
            label: 'Analyze Setup',
            icon: Users,
            description: 'Review current relay configuration'
        },
        {
            id: 'discover',
            label: 'Discovery Mode',
            icon: Search,
            description: 'Find new quality content'
        },
        {
            id: 'health',
            label: 'Network Health',
            icon: Activity,
            description: 'Monitor relay performance'
        }
    ]

    return (
        <div className={`border-b ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
            <nav className="flex overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !disabled && setActiveTab(tab.id)}
                            disabled={disabled}
                            className={`relative flex-1 min-w-0 px-6 py-4 text-left transition-all ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg transition-all ${isActive
                                        ? isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-600'
                                        : isDark ? 'bg-dark-700/50 text-gray-400' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    <Icon className="w-5 h-5" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className={`font-medium text-sm transition-colors ${isActive
                                            ? isDark ? 'text-white' : 'text-gray-900'
                                            : isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        {tab.label}
                                    </h3>
                                    <p className={`text-xs mt-1 transition-colors ${isDark ? 'text-gray-500' : 'text-gray-500'
                                        }`}>
                                        {tab.description}
                                    </p>
                                </div>
                            </div>

                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-purple-500"
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </button>
                    )
                })}
            </nav>
        </div>
    )
}

export default Navigation