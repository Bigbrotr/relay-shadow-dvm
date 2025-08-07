# 🔮 Relay Shadow DVM

> **Privacy-Focused Nostr Relay Intelligence**  
> Built for Bitcoin++ Privacy Edition Hackathon 2025

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Hackathon](https://img.shields.io/badge/Bitcoin%2B%2B-Privacy%20Edition-purple)](https://btcplusplus.dev/)

Relay Shadow is an intelligent Nostr Data Vending Machine (DVM) that provides privacy-focused relay recommendations by analyzing real network data from the BigBrotr dataset. It helps users optimize their relay selection based on their threat model, social network, and privacy requirements.

## 🏆 Hackathon Submission

**Project**: Privacy-focused Nostr relay recommendation system  
**Team**: BigBrotr  
**Awards Targeting**: Main Competition, Cloak & Dagger (Censorship Resistance), ChaCha Slide (Cryptography)

### Key Innovation
- **First DVM to use real relay usage data** from 800+ relays
- **Social graph analysis** for personalized recommendations  
- **Advanced privacy scoring** based on threat models
- **Unique BigBrotr dataset advantage** with publisher influence metrics

## ✨ Features

### 🛡️ Privacy-First Design
- **Threat-level based recommendations** (Low → Nation-State)
- **Censorship resistance analysis**
- **No-log relay identification**
- **Geographic diversity optimization**

### 🧠 Intelligent Analysis
- **Real usage data** from 800+ relays analyzed
- **Publisher influence scoring** using follower networks
- **Network health monitoring** with uptime/latency metrics
- **Social graph integration** for following-based recommendations

### 🔧 DVM Capabilities
- **Personalized relay recommendations**
- **Current setup analysis**
- **Network health monitoring**  
- **Discovery recommendations**
- **Relay rotation strategies**

## 🚀 Quick Start

### Prerequisites
- Node.js ≥18.0.0
- PostgreSQL database with BigBrotr dataset
- Nostr private key for DVM identity

### Installation

```bash
git clone https://github.com/Bigbrotr/relay-shadow-dvm.git
cd relay-shadow-dvm
npm install
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

Required environment variables:
```env
# Database (BigBrotr instance)
DB_HOST=your-bigbrotr-host
DB_NAME=bigbrotr
DB_USER=your-username
DB_PASSWORD=your-password
DB_PORT=5432

# DVM Configuration
DVM_PRIVATE_KEY=your-nostr-private-key
DVM_RELAYS=wss://relay.damus.io,wss://relay.snort.social

# Optional
LOG_LEVEL=info
```

### Database Setup

```bash
# Run preprocessing to create analytics tables
npm run setup
```

### Start the DVM

```bash
# Production mode
npm start

# Development mode with auto-restart
npm run dev
```

### Demo Interface

```bash
# Start web demo
npm run web
# Open http://localhost:3000
```

## 🎯 Usage Examples

### Basic Request (via Nostr event)

```json
{
  "kind": 5600,
  "content": "recommend relays for high privacy",
  "tags": [
    ["p", "DVM_PUBKEY"],
    ["param", "threat_level", "high"],
    ["param", "use_case", "journalism"],
    ["param", "max_results", "5"]
  ]
}
```

### Response

```json
{
  "type": "relay_recommendations",
  "recommendations": {
    "primary": [
      {
        "url": "wss://privacy-relay.swiss",
        "scores": {
          "overall": 9.2,
          "privacy": 9.8,
          "reliability": 8.9
        },
        "network": {
          "followingUsersHere": 15,
          "totalInfluenceWeight": 234.5
        },
        "reasoning": "Excellent privacy protections, used by 15 of your followed users"
      }
    ]
  }
}
```

## 🏗️ Architecture

### Data Pipeline
```
BigBrotr Database → Analytics Preprocessing → DVM Intelligence → Nostr Recommendations
```

### Core Components
- **Analytics Engine**: Pre-computed relay quality scores
- **Privacy Scorer**: Threat-model based evaluation
- **Social Analyzer**: Following network analysis  
- **Health Monitor**: Real-time relay status
- **DVM Server**: Nostr protocol integration

### Database Schema
- **relay_analytics**: Comprehensive relay metrics
- **publisher_influence**: Social graph analysis
- **relay_quality_scores**: Multi-factor privacy scoring
- **relay_recommendations**: Materialized recommendations view

## 🧪 Testing

```bash
# Test DVM with sample requests
npm test

# Manual testing with specific threat level
node src/scripts/test-client.js --threat-level high --user npub1...
```

## 📊 Dataset

Built on **BigBrotr's unique dataset**:
- **800+ relays** monitored continuously
- **Real event distribution** across relays  
- **Publisher influence metrics** from social graph
- **Historical uptime/performance** data
- **Metadata analysis** (NIP-11, policies, etc.)

This gives Relay Shadow an unprecedented advantage in understanding the real Nostr network topology.

## 🎨 Demo Scenarios

### Scenario 1: "Whistleblower"
- **Input**: Nation-state threat, requires Tor, avoid Five Eyes
- **Output**: Carefully curated high-anonymity relays

### Scenario 2: "Content Creator"  
- **Input**: Moderate privacy, good performance, broad reach
- **Output**: Balanced privacy/performance recommendations

### Scenario 3: "Network Analysis"
- **Input**: User's existing relay list
- **Output**: Privacy risk analysis + improvement suggestions

## 🤝 Contributing

This project was built for Bitcoin++ Privacy Hackathon. For post-hackathon development:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **BigBrotr** for the comprehensive Nostr relay dataset
- **Bitcoin++ Hackathon** organizers and sponsors
- **Nostr community** for building the open protocol
- **All relay operators** contributing to network decentralization

## 🔗 Links

- **Demo**: [Live Demo Link]
- **Devpost**: [Hackathon Submission]
- **BigBrotr**: https://bigbrotr.com
- **Documentation**: [docs/](docs/)

---

*Built with ⚡ for Bitcoin++ Privacy Edition Hackathon 2025*  
*Empowering private communication through intelligent relay selection*