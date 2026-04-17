#!/bin/bash
# MicoPay Server Starter

echo "🚀 Starting MicoPay Servers..."

# Kill any existing processes on ports 3000 and 5185
fuser -k 3000/tcp 2>/dev/null
fuser -k 5185/tcp 2>/dev/null
sleep 1

# Start API server
echo "📡 Starting API server on port 3000..."
cd /home/josealfredo/micopay-protocol/apps/api
nohup npm run dev > /tmp/micopay-api.log 2>&1 &
API_PID=$!

# Wait for API to start
sleep 4

# Start Web server
echo "🌐 Starting Web server on port 5185..."
cd /home/josealfredo/micopay-protocol/apps/web
nohup npm run dev > /tmp/micopay-web.log 2>&1 &
WEB_PID=$!

# Wait for web to start
sleep 4

# Verify servers are running
echo ""
echo "✅ Server Status:"
echo "----------------"

if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API: http://localhost:3000 (PID: $API_PID)"
else
    echo "❌ API: Failed to start"
fi

if curl -s http://localhost:5185 > /dev/null 2>&1; then
    echo "✅ Web: http://localhost:5185 (PID: $WEB_PID)"
else
    echo "❌ Web: Failed to start"
fi

echo ""
echo "📝 Logs:"
echo "  API: /tmp/micopay-api.log"
echo "  Web: /tmp/micopay-web.log"
echo ""
echo "💡 To stop: pkill -f 'npm run'"