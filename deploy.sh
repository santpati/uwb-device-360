#!/bin/bash

# Configuration
PEM_FILE="/Users/santpati/Desktop/Folders/AI/Santosh-Demo.pem"
HOST="ec2-user@ec2-100-53-121-117.compute-1.amazonaws.com"
REMOTE_DIR="uwb-device-360"
REPO_URL="https://github.com/santpati/uwb-device-360.git"

echo "========================================"
echo "🚀 Starting Deployment to AWS EC2"
echo "========================================"

# 1. Push local changes to Git
echo "📦 Step 1: Pushing local changes..."
git add .
git commit -m "Deploy: Automated deployment $(date)" 2>/dev/null || echo "Nothing to commit"
git push
echo "✅ Local changes pushed."

# 2. Deploy to Remote Server
echo "☁️  Step 2: Connecting to EC2..."
ssh -o StrictHostKeyChecking=no -i "$PEM_FILE" $HOST << EOF
    set -e # Exit on error

    # Check for PM2
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        sudo npm install -g pm2
    fi

    # Check for Directory
    if [ -d "$REMOTE_DIR" ]; then
        echo "🔄 Pulling latest changes..."
        cd $REMOTE_DIR
        git pull origin main
    else
        echo "📥 Cloning repository..."
        git clone $REPO_URL
        cd $REMOTE_DIR
    fi

    # Install & Build
    echo "🛠️  Installing dependencies..."
    npm install
    
    echo "🏗️  Building application..."
    npm run build

    # Start/Restart Application
    # Start/Restart Application
    echo "🚀 (Re)Starting application in Cluster Mode..."
    pm2 delete "uwb-device-360" 2> /dev/null || true
    pm2 start ecosystem.config.js
    
    # Start/Restart System Monitor
    echo "📊 Starting System Monitor..."
    chmod +x monitor_system.sh
    pm2 delete "system-monitor" 2> /dev/null || true
    pm2 start ./monitor_system.sh --name "system-monitor"

    pm2 save

    echo "✅ Application running on port 8080"
EOF

echo "========================================"
echo "🎉 Deployment Complete!"
echo "Global Deployment URL: http://ec2-100-53-121-117.compute-1.amazonaws.com:8080"
echo "========================================"
