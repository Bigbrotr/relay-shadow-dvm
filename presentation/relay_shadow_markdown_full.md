# 🔮 Relay Shadow DVM

**Intelligent Relay Selection for Nostr Networks**

[![Nostr DVM](https://img.shields.io/badge/Nostr-DVM-orange)](#)
[![Open Source](https://img.shields.io/badge/License-MIT-blue)](#)

---

## ❌ The Problem

### 🏢 Nostr Centralization Risk

Despite being designed as a decentralized protocol, Nostr suffers from practical centralization issues:

- Most users connect to the same popular relays
- Default relay lists create single points of failure
- Geographic concentration reduces censorship resistance
- Network effects favor well-known relays over diverse options

### ❓ No Selection Logic

Users lack proper tools and techniques for intelligent relay selection:

- No standardized method for evaluating relay quality
- Privacy and security considerations are ignored
- Performance metrics are not easily accessible
- Social and network effects are not considered
- Users make random or uninformed choices

> **The Core Issue:** Without intelligent relay selection, Nostr's decentralization promise remains unrealized, leaving users vulnerable to censorship, surveillance, and network failures.

---

## ✅ The Solution

### 🎯 Relay Shadow DVM

An intelligent Nostr Data Vending Machine that provides data-driven relay recommendations based on comprehensive network analysis. By leveraging real usage patterns and network topology data, it enables users to make informed decisions about their relay selection strategy.

### 🚀 Powered by BigBrotr Infrastructure

This solution is only possible thanks to **BigBrotr** - a comprehensive full indexing infrastructure for Nostr events and relays. BigBrotr provides:

- **Complete Event Indexing:** Full coverage of Nostr event distribution across the network
- **Relay Monitoring:** Continuous tracking of 800+ relays with performance metrics
- **Network Topology Analysis:** Real-time understanding of how events flow through the network
- **Historical Data:** Long-term patterns and trends for informed analysis
- **Metadata Collection:** Comprehensive relay information including policies and capabilities

---

## ✨ Key Features

### 🛡️ Privacy-Focused Analysis
- Threat-level based recommendations
- Censorship resistance evaluation
- Privacy policy analysis
- Geographic diversity optimization
- Tor compatibility assessment

### 📊 Data-Driven Intelligence
- Real usage patterns from 800+ relays
- Publisher influence scoring
- Network health monitoring
- Social graph integration
- Performance benchmarking

### ⚡ DVM Integration
- Nostr-native recommendation service
- Personalized relay suggestions
- Current setup analysis
- Real-time status updates
- Automated optimization strategies

### 🔍 Comprehensive Metrics
- Uptime and reliability tracking
- Latency and performance data
- Event distribution patterns
- Network connectivity analysis
- Policy compliance verification

---

## 🏗️ System Architecture

**Data Flow:** BigBrotr Database → Analytics Processing → DVM Intelligence → Nostr Recommendations

### Core Components

#### 📈 Analytics Engine
Processes BigBrotr data to compute relay quality scores across multiple dimensions including privacy, performance, and network health.

#### 🔒 Privacy Scorer
Evaluates relays based on threat models, censorship resistance, geographic diversity, and privacy policies.

#### 👥 Social Analyzer
Analyzes social networks and following patterns to provide personalized recommendations based on user connections.

#### 💚 Health Monitor
Continuously monitors relay status, uptime, performance, and connectivity across the entire network.

#### 🔌 DVM Server
Handles Nostr protocol integration, request processing, and response generation for seamless user interaction.

#### 🌐 Web Interface
Provides an intuitive web-based demonstration and testing interface for exploring recommendations.

---

## 📊 Scoring System

**Multi-Dimensional Algorithm:** Each relay is evaluated across 6 main dimensions, with scores from 0 to 10, to obtain a weighted overall score.

### 🔒 Privacy Score (0-10)

```sql
-- Privacy Score Calculation
CASE 
    WHEN privacy_policy AND terms_of_service THEN 8.0
    WHEN privacy_policy OR terms_of_service THEN 5.0
    WHEN name AND description THEN 3.0
    ELSE 1.0
END +
CASE 
    WHEN auth_required = false THEN 2.0
    ELSE 0.0
END
```

- **8+ points:** Complete privacy policy and ToS
- **5+ points:** At least one of the two documents
- **+2 points:** No authentication required

### 🌐 Diversity Score (0-10)

```sql
-- Diversity Score Calculation
LEAST(LOG(unique_publishers + 1) * 2.0, 10.0)
```

- **Metric:** Number of unique publishers
- **Calculation:** Natural logarithm to avoid dominance
- **Maximum:** Capped at 10 points
- **Objective:** Favor user diversity

### ⚡ Performance Score (0-10)

```sql
-- Performance Score Calculation
CASE 
    WHEN avg_rtt_read < 2000ms THEN 
        10.0 - (avg_rtt_read / 200.0)
    WHEN avg_rtt_read IS NULL THEN 5.0
    ELSE 1.0
END
```

- **Metric:** Average Round Trip Time
- **Optimal:** < 200ms = 10 points
- **Acceptable:** < 2000ms = linear scaling
- **Unknown:** 5 points (neutral)

### 💚 Reliability Score (0-10)

```sql
-- Reliability Score Calculation
uptime_percentage * 10.0
```

- **Metric:** Uptime percentage
- **99% uptime:** 9.9 points
- **95% uptime:** 9.5 points
- **Minimum threshold:** 90% to be considered

### 📈 Activity Score (0-10)

```sql
-- Activity Score Calculation
CASE 
    WHEN events_per_day BETWEEN 5 AND 500 THEN 10.0
    WHEN events_per_day BETWEEN 1 AND 1000 THEN 
        8.0 - ABS(LOG(events_per_day) - LOG(50)) * 0.5
    ELSE 3.0
END
```

- **Optimal zone:** 5-500 events/day
- **Penalty:** Too few or too many events
- **Target:** ~50 events/day

### 👥 Social Score (0-10)

```sql
-- Social Score Calculation
AVG(publisher_influence_weight) + recency_bonus
```

- **Influencer Weight:** Average of user weights
- **Recency Bonus:** +2 points if active in last 30 days
- **Personalization:** Based on user's following list

### 🎯 Final Score

```sql
final_score = (privacy_score * 0.25) + (diversity_score * 0.20) + 
              (performance_score * 0.15) + (reliability_score * 0.20) + 
              (activity_score * 0.10) + (social_score * 0.10)
```

Weights can be customized based on user's threat level (privacy > performance for high threat level).

---

## 🛠️ DVM Services

### 1. 🎯 Relay Recommendations

#### Input:
```json
{
  "threat_level": "high|medium|low",
  "use_case": "privacy|performance|balanced",
  "max_results": 5,
  "geographic_preferences": ["EU", "non-5eyes"],
  "require_tor": true,
  "exclude_relays": ["wss://relay1.com"]
}
```

#### Output:
```json
{
  "recommendations": {
    "primary": [
      {
        "url": "wss://privacy-relay.swiss",
        "scores": {
          "overall": 9.2,
          "privacy": 9.8,
          "reliability": 8.9
        },
        "features": {
          "no_logs": true,
          "tor_supported": true,
          "uptime_percentage": 99.2
        },
        "reasoning": "Excellent privacy protections..."
      }
    ],
    "backup": [...],
    "discovery": [...]
  }
}
```

### 2. 🔍 Relay Setup Analysis

#### Input:
```json
{
  "current_relays": [
    "wss://relay.damus.io",
    "wss://relay.snort.social",
    "wss://nostr.wine"
  ],
  "user_pubkey": "npub1...",
  "analysis_depth": "basic|detailed"
}
```

#### Output:
```json
{
  "analysis": {
    "overall_score": 6.4,
    "strengths": [
      "High reliability (98.5% avg uptime)",
      "Good performance (avg 150ms latency)"
    ],
    "weaknesses": [
      "Geographic concentration (80% US-based)",
      "Limited privacy policies",
      "Popular relay dependency"
    ],
    "recommendations": [
      {
        "action": "add",
        "relay": "wss://eu-relay.example.com",
        "reason": "Improve geographic diversity"
      },
      {
        "action": "replace",
        "current": "wss://relay.wine",
        "suggested": "wss://privacy-relay.ch",
        "reason": "Better privacy score"
      }
    ]
  }
}
```

### 3. 💚 Network Health Monitoring

#### Input:
```json
{
  "relay_url": "wss://relay.example.com",
  "metrics": ["uptime", "latency", "events", "all"],
  "time_range": "24h|7d|30d",
  "compare_to": "network_average"
}
```

#### Output:
```json
{
  "health_report": {
    "relay_url": "wss://relay.example.com",
    "period": "7d",
    "metrics": {
      "uptime": {
        "value": "98.2%",
        "vs_network": "+2.1%",
        "trend": "stable"
      },
      "avg_latency": {
        "value": "145ms",
        "vs_network": "-20ms",
        "trend": "improving"
      },
      "events_processed": {
        "value": "12,450",
        "vs_network": "average",
        "trend": "growing"
      }
    },
    "alerts": [
      "Outage detected: 2 hours on 2025-01-08"
    ],
    "recommendation": "Reliable relay with good performance"
  }
}
```

### 4. 🧭 Discovery & Exploration

#### Input:
```json
{
  "discovery_type": "geographic|niche|performance|privacy",
  "current_setup": ["wss://relay1.com", "wss://relay2.com"],
  "following_pubkeys": ["npub1...", "npub2..."],
  "explore_criteria": {
    "min_uptime": 95,
    "max_latency": 300,
    "languages": ["en", "it"]
  }
}
```

#### Output:
```json
{
  "discoveries": {
    "geographic": [
      {
        "relay": "wss://asia-relay.nostr.com",
        "region": "Asia-Pacific",
        "benefit": "24/7 coverage improvement",
        "score": 8.1
      }
    ],
    "niche": [
      {
        "relay": "wss://artist-relay.studio",
        "specialty": "Art & Creative Community",
        "user_overlap": "15% of your follows",
        "score": 7.8
      }
    ],
    "hidden_gems": [
      {
        "relay": "wss://underground.relay",
        "why_hidden": "High quality, low visibility",
        "advantages": ["Excellent privacy", "Low latency"],
        "score": 9.0
      }
    ]
  }
}
```

---

## 🎯 Use Cases

### 🔒 High-Privacy Users
- **Scenario:** Journalists, whistleblowers, activists
- **Service:** Relay Recommendations with threat_level="high"
- **Output:** Relays with no-log policies, Tor support, geographic diversity

### 📱 Content Creators
- **Scenario:** Influencers, artists, brands seeking maximum reach
- **Service:** Discovery & Exploration + Setup Analysis
- **Output:** High-performance relays with large user bases

### 🏢 Enterprise Users
- **Scenario:** Companies requiring compliance and reliability
- **Service:** Continuous Network Health Monitoring
- **Output:** Relays with clear SLAs, defined policies, guaranteed uptime

### 🌍 Global Users
- **Scenario:** Users in countries with restrictions or censorship
- **Service:** All 4 services for comprehensive strategy
- **Output:** Geographically distributed and resilient relay portfolio

---

## 🌟 Benefits

### 👤 For Users
- Data-driven decisions instead of guesswork
- Enhanced personalized privacy and security
- Improved resilience against failures and censorship
- Recommendations that adapt to individual needs
- Reduced dependency on mainstream relays

### 🌐 For the Nostr Ecosystem
- Promotes true traffic decentralization
- Increases network diversity and distribution
- Supports smaller and niche relay operators
- Improves overall network health
- Advances privacy and security best practices

---

## 💡 Conclusion

### Solving Nostr's Centralization Challenge

Relay Shadow DVM addresses the fundamental problem of relay centralization in Nostr by providing intelligent, data-driven selection tools. Built on the comprehensive BigBrotr infrastructure, it empowers users to make informed decisions that promote true decentralization while meeting their specific privacy and performance requirements.

By transforming relay selection from a random choice into an intelligent decision, we're helping realize Nostr's vision of a truly decentralized and censorship-resistant communication protocol.