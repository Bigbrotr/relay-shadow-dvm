# 🔮 Relay Shadow DVM

> **Privacy-Focused Nostr Relay Intelligence & Recommendation System**  
> Built for Bitcoin++ Privacy Edition Hackathon 2025

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Hackathon](https://img.shields.io/badge/Bitcoin%2B%2B-Privacy%20Edition-purple)](https://btcplusplus.dev/)
[![DVM](https://img.shields.io/badge/Nostr-DVM-orange)](https://nostr.com/)

Relay Shadow is an intelligent Nostr Data Vending Machine (DVM) that provides privacy-focused relay recommendations by analyzing real network data from the comprehensive BigBrotr dataset. It helps users optimize their relay selection based on their specific threat model, social network, and privacy requirements.

## 🏆 Hackathon Submission

**Project**: Privacy-focused Nostr relay recommendation system  
**Team**: BigBrotr  
**Awards Targeting**: Main Competition, Cloak & Dagger (Censorship Resistance), ChaCha Slide (Cryptography)

### 🎯 Key Innovation
- **First DVM to use real relay usage data** from 800+ relays
- **Advanced social graph analysis** for personalized recommendations  
- **Multi-tier privacy scoring** based on comprehensive threat models
- **Unique BigBrotr dataset advantage** with publisher influence metrics
- **Real-time network health monitoring** with uptime and latency tracking

---

## ✨ Features

### 🛡️ Privacy-First Architecture
- **Threat-level based recommendations** (Low → Nation-State level protection)
- **Censorship resistance analysis** using network diversity metrics
- **No-log relay identification** and privacy policy analysis
- **Geographic diversity optimization** for enhanced anonymity
- **Tor compatibility scoring** for maximum privacy scenarios

### 🧠 Intelligent Analysis Engine
- **Real usage data analysis** from 800+ continuously monitored relays
- **Publisher influence scoring** using follower networks and social graphs
- **Network health monitoring** with comprehensive uptime/latency metrics
- **Social graph integration** for following-based personalized recommendations
- **Advanced privacy scoring algorithms** across multiple threat vectors

### 🔧 DVM Capabilities
- **Personalized relay recommendations** based on user requirements
- **Current relay setup analysis** with improvement suggestions
- **Network health monitoring** and real-time status updates
- **Discovery recommendations** for expanding relay coverage
- **Relay rotation strategies** for enhanced operational security
- **Batch processing** for multiple recommendation scenarios

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥18.0.0
- PostgreSQL database with BigBrotr dataset
- Nostr private key for DVM identity
- Git for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/bigbrotr/relay-shadow-dvm.git
cd relay-shadow-dvm

# Install dependencies
npm install

# Install client dependencies
cd src/client
npm install
cd ../..
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

**Required environment variables:**
```env
# Database Configuration (BigBrotr instance)
DB_HOST=your-bigbrotr-host
DB_NAME=bigbrotr
DB_USER=your-username
DB_PASSWORD=your-password
DB_PORT=5432

# DVM Configuration
DVM_PRIVATE_KEY=your-nostr-private-key-in-hex
DVM_RELAYS=wss://relay.damus.io,wss://relay.snort.social,wss://nostr.wine

# Optional Configuration
LOG_LEVEL=info
PORT=3000
ENABLE_WEB_DEMO=true
```

### Database Setup

```bash
# Run comprehensive setup (creates analytics tables, functions, and sample data)
npm run setup
```

### Start the System

```bash
# Start only the DVM
npm start

# Start only the client
npm run web
```

### Access the Demo
- **Web Interface**: http://localhost:3000

---

## 🎯 Usage Examples

### 1. Basic Request (via Nostr event)

```json
{
  "kind": 5600,
  "content": "recommend relays for high privacy journalism work",
  "tags": [
    ["p", "DVM_PUBKEY"],
    ["param", "threat_level", "high"],
    ["param", "use_case", "journalism"],
    ["param", "max_results", "5"],
    ["param", "require_tor", "true"]
  ]
}
```

### 2. Social Graph Analysis Request

```json
{
  "kind": 5600,
  "content": "analyze my current relay setup",
  "tags": [
    ["p", "DVM_PUBKEY"],
    ["param", "action", "analyze"],
    ["param", "current_relays", "wss://relay1.com,wss://relay2.com"],
    ["param", "npub", "npub1...user_pubkey"]
  ]
}
```

### 3. Example Response

```json
{
  "type": "relay_recommendations",
  "threat_level": "high",
  "recommendations": {
    "primary": [
      {
        "url": "wss://privacy-relay.swiss",
        "scores": {
          "overall": 9.2,
          "privacy": 9.8,
          "reliability": 8.9,
          "censorship_resistance": 9.5
        },
        "features": {
          "no_logs": true,
          "tor_supported": true,
          "geographic_diversity": "high",
          "uptime_percentage": 99.2
        },
        "social_metrics": {
          "following_users_here": 15,
          "total_influence_weight": 234.5,
          "publisher_diversity": 0.87
        },
        "reasoning": "Excellent privacy protections with no-log policy, Tor support, and used by 15 users you follow. Strong censorship resistance in neutral jurisdiction."
      }
    ],
    "backup": [...],
    "discovery": [...]
  },
  "analysis": {
    "current_setup_score": 6.4,
    "improvement_areas": ["geographic_diversity", "tor_support"],
    "risk_factors": ["concentration_in_single_jurisdiction"]
  }
}
```

---

## 🏗️ Architecture

### Data Flow Pipeline
```
BigBrotr Database → Analytics Preprocessing → DVM Intelligence → Nostr Recommendations
```

### Core Components

#### 1. **Analytics Engine** (`src/analytics/`)
- Pre-computed relay quality scores across multiple dimensions
- Publisher influence calculations using social graph data
- Network health metrics aggregation and trending
- Privacy policy analysis and scoring

#### 2. **Privacy Scorer** (`src/privacy/`)
- Multi-factor threat model evaluation
- Censorship resistance scoring algorithms
- Geographic and jurisdictional diversity analysis
- Tor compatibility and anonymity metrics

#### 3. **Social Analyzer** (`src/social/`)
- Following network analysis and recommendations
- Publisher influence weight calculations  
- Social graph clustering and community detection
- Personalized recommendation generation

#### 4. **Health Monitor** (`src/health/`)
- Real-time relay status monitoring
- Uptime and latency tracking
- Performance benchmarking and comparison
- Network connectivity analysis

#### 5. **DVM Server** (`src/dvm/`)
- Nostr protocol integration and event handling
- Request parsing and validation
- Response generation and formatting
- Multi-relay broadcasting

#### 6. **Web Demo** (`src/client/`)
- Interactive demonstration interface
- Real-time DVM testing and visualization
- Scenario-based recommendation examples
- Educational privacy threat model explanations

### Database Schema

#### Core Tables
- **`relay_analytics`**: Comprehensive relay metrics and scoring
- **`publisher_influence`**: Social graph analysis and influence weights
- **`relay_quality_scores`**: Multi-factor privacy and performance scoring
- **`network_health`**: Real-time and historical health metrics

#### Materialized Views
- **`relay_recommendations`**: Pre-computed recommendations by threat level
- **`social_recommendations`**: Following-based personalized suggestions
- **`privacy_rankings`**: Ranked relays by privacy characteristics

---

## 📊 Dataset & Data Sources

### BigBrotr Dataset Advantage

Relay Shadow is built on **BigBrotr's unique and comprehensive dataset**:

- **800+ relays** monitored continuously across the network
- **Real event distribution patterns** showing actual relay usage
- **Publisher influence metrics** derived from follower network analysis  
- **Historical uptime and performance** data spanning months
- **Metadata analysis** including NIP-11 compliance, policies, and features
- **Geographic and jurisdictional mapping** for privacy analysis
- **Network topology insights** showing relay interconnections

### Data Preprocessing

The system includes sophisticated preprocessing that creates:
- **Relay quality scores** across privacy, performance, and reliability dimensions
- **Social graph analysis** showing which relays are used by influential publishers
- **Network health metrics** with real-time monitoring capabilities
- **Privacy policy analysis** with automated scoring of relay characteristics
- **Threat model mappings** connecting user requirements to relay features

This comprehensive dataset gives Relay Shadow an unprecedented advantage in understanding the real Nostr network topology and providing genuinely useful recommendations.

---

## 🎨 Demo Scenarios

The system includes several pre-built demonstration scenarios:

### Scenario 1: "Whistleblower Protection"
- **Input**: Nation-state threat level, requires Tor, avoid Five Eyes jurisdictions
- **Output**: Carefully curated high-anonymity relays with strong privacy protections
- **Features**: No-log policies, Tor support, geographic diversity, censorship resistance

### Scenario 2: "Content Creator Outreach"  
- **Input**: Moderate privacy needs, good performance, broad audience reach
- **Output**: Balanced privacy/performance recommendations optimized for distribution
- **Features**: High uptime, good performance, diverse user bases, social graph optimization

### Scenario 3: "Network Health Analysis"
- **Input**: User's existing relay list for evaluation
- **Output**: Comprehensive privacy risk analysis with specific improvement suggestions
- **Features**: Gap analysis, risk identification, incremental improvement recommendations

### Scenario 4: "Journalist Source Protection"
- **Input**: High privacy requirements with professional communication needs
- **Output**: Professionally-oriented privacy-first relay recommendations
- **Features**: Source protection, metadata minimization, reliable communication channels

---

## 🤝 Contributing

This project was built for Bitcoin++ Privacy Hackathon. For post-hackathon development:

### Development Process
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-privacy-feature`)
3. Make changes with comprehensive tests
4. Commit changes (`git commit -m 'Add amazing privacy feature'`)
5. Push to branch (`git push origin feature/amazing-privacy-feature`)
6. Open a Pull Request with detailed description

### Areas for Contribution
- **Privacy Analysis**: New threat model implementations
- **Social Graph**: Advanced recommendation algorithms  
- **Network Health**: Real-time monitoring improvements
- **DVM Features**: New Nostr integration capabilities
- **Documentation**: Usage examples and educational content

### Code Standards
- ES6+ JavaScript with comprehensive error handling
- Extensive logging for debugging and monitoring
- Database transactions for data consistency
- Comprehensive test coverage for all components
- Security-first development practices

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for complete details.

**Key Points:**
- ✅ Commercial use permitted
- ✅ Modification and distribution allowed  
- ✅ Private use encouraged
- ⚠️ No warranty provided
- ⚠️ License and copyright notice required

---

## 🙏 Acknowledgments

### Core Contributors
- **BigBrotr Team** for the comprehensive Nostr relay dataset and network analysis infrastructure
- **Bitcoin++ Hackathon Organizers** for fostering privacy-focused Bitcoin development
- **Nostr Protocol Community** for building the open, decentralized communication protocol
- **Global Relay Operators** contributing to network decentralization and censorship resistance

### Technical Foundations
- **PostgreSQL** for robust data storage and analytics capabilities
- **Node.js Ecosystem** for reliable server-side JavaScript execution
- **Nostr Protocol** for decentralized communication standards
- **Privacy Research Community** for threat modeling frameworks and best practices

### Special Recognition
- **Privacy Advocates** working to protect digital rights globally
- **Open Source Contributors** maintaining the tools and libraries we depend on
- **Hackathon Participants** pushing the boundaries of privacy technology
- **Beta Testers** providing feedback during development

---

## 🔗 Important Links

### Project Resources
- **🌐 Live Demo**: [relay-shadow-demo.bigbrotr.com](https://relay-shadow-demo.bigbrotr.com)
- **📊 Devpost Submission**: [devpost.com/software/relay-shadow-dvm](https://devpost.com/software/relay-shadow-dvm)
- **🗂️ Documentation**: [docs/](docs/) folder for technical specifications
- **🧪 API Documentation**: [docs/api.md](docs/api.md) for DVM integration

### External Resources  
- **BigBrotr Platform**: [bigbrotr.com](https://bigbrotr.com) - Nostr network analytics
- **Nostr Protocol**: [nostr.com](https://nostr.com) - Decentralized communication protocol
- **Bitcoin++ Event**: [btcplusplus.dev](https://btcplusplus.dev) - Privacy Edition Hackathon
- **DVM Specification**: [github.com/nostr-protocol/nips/blob/master/90.md](https://github.com/nostr-protocol/nips/blob/master/90.md)

### Community & Support
- **GitHub Issues**: [Issues Tab](https://github.com/bigbrotr/relay-shadow-dvm/issues) for bug reports and feature requests
- **Discussions**: [Discussions Tab](https://github.com/bigbrotr/relay-shadow-dvm/discussions) for questions and community interaction
- **Nostr**: `npub1relayshadow...` - Follow our DVM for updates (check logs for actual pubkey)

---

<div align="center">

**Built with ⚡ for Bitcoin++ Privacy Edition Hackathon 2025**  
*Empowering private communication through intelligent relay selection*

---

*"Privacy is not about hiding wrongdoing. Privacy is about protecting what defines us as human beings."* 

[![Bitcoin++](https://img.shields.io/badge/Bitcoin%2B%2B-Privacy%20Edition-purple)](https://btcplusplus.dev/)
[![Nostr](https://img.shields.io/badge/Nostr-DVM-orange)](https://nostr.com/)
[![BigBrotr](https://img.shields.io/badge/Powered%20by-BigBrotr-blue)](https://bigbrotr.com/)

</div>