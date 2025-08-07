#!/bin/bash

# Relay Shadow DVM - Quick Hackathon Setup Script
# Run this script to prepare everything for the hackathon

set -e

echo "🚀 Relay Shadow DVM - Hackathon Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print