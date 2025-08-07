# 🚀 Pre-Hackathon Setup Checklist

This checklist ensures **Relay Shadow DVM** is fully prepared and optimized for the hackathon demo.

## 📋 Pre-Event Setup (Run 1-2 days before)

### **1. Database Preparation**
```bash
# Run comprehensive setup (this does everything)
node src/scripts/comprehensive-setup.js

# Alternative: Step by step
npm run setup                    # Basic setup
node src/scripts/comprehensive-setup.js  # Full preprocessing
```

**Expected Results:**
- ✅ All analytics tables created and populated
- ✅ Query functions installed and tested  
- ✅ Materialized views refreshed
- ✅ Sample data generated for quick demos
- ✅ Pre-computed responses cached
- ✅ Database optimized with ANALYZE

### **2. System Validation**
```bash
# Test DVM server
npm start
# Should show: "✅ Found X high-quality relays for recommendations"

# Test CLI client
export DVM_PUBKEY="your-dvm-public-key-from-server-output"
npm run test:recommend
# Should return actual recommendations

# Test React client
npm run client:dev
# Should open http://localhost:3000 with beautiful interface
```

### **3. Performance Optimization**
```bash
# Check database performance
psql -d bigbrotr -c "SELECT COUNT(*) FROM relay_recommendations WHERE overall_score > 8.0;"
# Should return > 50 high-quality relays

# Verify response times
time npm run test:health
# Should complete in < 5 seconds
```

### **4. Demo Data Preparation**
**Files that should exist after setup:**
- ✅ `sample-data.json` - Sample recommendations for all threat levels
- ✅ `precomputed-responses.json` - Cached responses for demo scenarios
- ✅ `setup-report.json` - Detailed setup validation report

## 🎯 Day of Hackathon

### **Morning Setup (30 minutes before demo)**

#### **1. Quick System Check**
```bash
# Verify database connection
npm run setup --quick-check

# Start DVM server
npm start
# Note down the DVM public key displayed

# Test one request
npm run test:recommend
```

#### **2. Client Preparation**
```bash
# Install client dependencies (if not done)
npm run client:install

# Start development server
npm run client:dev
# Opens http://localhost:3000

# Test connection flow:
# 1. Generate new key
# 2. Enter DVM public key
# 3. Connect
# 4. Send test request
```

#### **3. Demo Environment Setup**
- **Browser tabs ready:**
  - Tab 1: `http://localhost:3000` (React client)
  - Tab 2: Terminal with DVM running
  - Tab 3: Terminal for CLI demos
- **Screen sharing tested**
- **Backup data ready** (sample-data.json)

### **Demo Sequence (3 minutes max)**

#### **Minute 1: Problem & Solution** (30s)
> "Nostr users select relays randomly, exposing them to privacy risks and censorship. Relay Shadow solves this with intelligent, privacy-focused recommendations."

**Show**: React client opening with beautiful interface

#### **Minute 2: Live Demo** (90s)
1. **Generate Keys** (15s)
   - Click "Generate New Key" 
   - Show smooth animation

2. **Connect to DVM** (15s)
   - Paste DVM public key
   - Show real-time connection

3. **Smart Recommendations** (60s)
   - Select "Nation-State" threat level
   - Show warning animation
   - Send request with loading state
   - Display real recommendations with scores
   - Explain: "These are real relays from our BigBrotr dataset"

#### **Minute 3: Technical Depth** (60s)
4. **Show Data Intelligence** (30s)
   - Switch to "Analyze Setup" tab
   - Show coverage analysis
   - Explain social graph integration

5. **CLI Power User Demo** (30s)
   - Quick terminal demo
   - `npm run test:health`
   - Show formatted output

**Closing**: *"Built on BigBrotr's unique dataset of 800+ relays with real usage patterns - this is the only DVM with actual network intelligence."*

## 🔧 Troubleshooting Guide

### **Common Issues & Solutions**

#### **Database Connection Issues**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Verify credentials
psql -d bigbrotr -c "SELECT COUNT(*) FROM events;"
```

#### **Missing Analytics Tables**
```bash
# Recreate analytics
node src/scripts/comprehensive-setup.js
```

#### **DVM Not Responding**
```bash
# Check DVM logs for errors
npm start | grep ERROR

# Verify database functions
psql -d bigbrotr -c "SELECT get_user_relay_recommendations('test', 'medium', 5, true);"
```

#### **Client Won't Connect**
- ✅ Verify DVM public key is correct
- ✅ Check WebSocket connections in browser DevTools
- ✅ Ensure relays are accessible
- ✅ Try incognito mode (clears localStorage)

#### **Poor Recommendations Quality**
```bash
# Check data quality
psql -d bigbrotr -c "SELECT COUNT(*) FROM relay_recommendations WHERE overall_score > 7.0;"

# Refresh materialized views
psql -d bigbrotr -c "REFRESH MATERIALIZED VIEW relay_recommendations;"
```

## 📊 Success Metrics

After comprehensive setup, you should have:

- **📈 Data Quality:**
  - 800+ relays analyzed
  - 50+ high-quality relays (score > 8.0)
  - 100+ influential publishers (score > 3.0)
  - 1000+ recent events (last 30 days)

- **⚡ Performance:**
  - DVM responses < 3 seconds
  - Client loads < 2 seconds
  - Database queries < 500ms average

- **🎨 Demo Readiness:**
  - React client works flawlessly
  - All animations smooth
  - Dark/light mode transitions
  - Real-time WebSocket connections

- **📁 Generated Files:**
  - `sample-data.json` (demo scenarios)
  - `precomputed-responses.json` (cached responses)
  - `setup-report.json` (validation results)

## 🎯 Final Validation Commands

**Run these commands to ensure everything is ready:**

```bash
# 1. Comprehensive system check
node src/scripts/comprehensive-setup.js

# 2. Quick functionality test
npm start &
sleep 5
npm run test:recommend
killall node

# 3. Client functionality test
npm run client:dev &
sleep 5
curl -I http://localhost:3000
killall node

# 4. Data quality verification
psql -d bigbrotr -c "
  SELECT 
    'High-quality relays' as metric,
    COUNT(*) as value
  FROM relay_recommendations 
  WHERE overall_score > 7.0
  UNION ALL
  SELECT 
    'Total relays analyzed' as metric,
    COUNT(*) as value
  FROM relay_recommendations;
"
```

## 🏆 Hackathon Day Confidence Check

Before presenting, verify:

- ✅ **Database**: Fully processed with analytics
- ✅ **DVM Server**: Starts and responds in < 3 seconds
- ✅ **React Client**: Beautiful, smooth, responsive
- ✅ **CLI Client**: Works for technical demo
- ✅ **Data Quality**: Real recommendations from BigBrotr
- ✅ **Demo Flow**: Practiced and timed (< 3 minutes)
- ✅ **Backup Plan**: Sample data ready if live demo fails

**You're ready to win! 🚀**

---

*Run this checklist 1-2 days before the hackathon to ensure everything is perfect for demo day.*